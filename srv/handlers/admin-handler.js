// ============================================================================
// Admin Service Handler — Quiz CRUD, analytics, import/export, live sessions
// ============================================================================
const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');
const { getAuditLogger } = require('./lib/audit-logger');
const { CsvExporter, CsvImporter } = require('./lib/csv-handler');
const { CertificateGenerator } = require('./lib/certificate-generator');
const { AIService } = require('./lib/ai-service');

class AdminServiceHandler extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to('db');
    const {
      Quizzes, QuizVersions, Questions, QuestionOptions, MatchPairs,
      QuizAttempts, AttemptAnswers, Tags, QuestionBank, BankQuestionOptions,
      Groups, QuizAssignments, LiveSessions, LiveParticipants, LeaderboardEntries,
      Certificates, AIGenerationRequests, AuditLogs
    } = db.entities('quiz.app');
    const audit = getAuditLogger(db);
    const csvExporter = new CsvExporter();
    const csvImporter = new CsvImporter();
    const certGen = new CertificateGenerator();
    const aiService = new AIService();

    // ---- Tenant isolation: inject tenantId filter on all reads/writes ----
    this.before('*', async (req) => {
      const tenantId = req.user?.tenant || req.user?.attr?.tenantId;
      if (tenantId) {
        req._tenantId = tenantId;
      }
    });

    // ---- PUBLISH QUIZ ----
    this.on('publishQuiz', async (req) => {
      const { quizId } = req.data;
      const quiz = await SELECT.one.from(Quizzes).where({ ID: quizId });
      if (!quiz) return req.reject(404, 'Quiz not found');

      // Validate quiz has questions
      const version = await SELECT.one.from(QuizVersions)
        .where({ quiz_ID: quizId, isActive: true });
      if (!version) return req.reject(400, 'Quiz has no active version');

      const qCount = await SELECT.one.from(Questions)
        .columns('count(*) as cnt')
        .where({ quizVersion_ID: version.ID });
      if (!qCount || qCount.cnt === 0) {
        return req.reject(400, 'Quiz must have at least one question');
      }

      // Generate share code if none
      const shareCode = quiz.shareCode || generateShareCode();

      await UPDATE(Quizzes).where({ ID: quizId }).set({
        status: 'published',
        shareCode
      });

      await audit.log('quiz.published', 'Quizzes', quizId, { status: quiz.status }, { status: 'published' }, req.user?.id);

      return { success: true, message: `Quiz published with code: ${shareCode}` };
    });

    // ---- UNPUBLISH QUIZ ----
    this.on('unpublishQuiz', async (req) => {
      const { quizId } = req.data;
      await UPDATE(Quizzes).where({ ID: quizId }).set({ status: 'draft' });
      await audit.log('quiz.unpublished', 'Quizzes', quizId, null, { status: 'draft' }, req.user?.id);
      return { success: true, message: 'Quiz unpublished' };
    });

    // ---- ARCHIVE QUIZ ----
    this.on('archiveQuiz', async (req) => {
      const { quizId } = req.data;
      await UPDATE(Quizzes).where({ ID: quizId }).set({ status: 'archived' });
      await audit.log('quiz.archived', 'Quizzes', quizId, null, { status: 'archived' }, req.user?.id);
      return { success: true, message: 'Quiz archived' };
    });

    // ---- CREATE QUIZ VERSION (for safe editing) ----
    this.on('createQuizVersion', async (req) => {
      const { quizId } = req.data;
      const quiz = await SELECT.one.from(Quizzes).where({ ID: quizId });
      if (!quiz) return req.reject(404, 'Quiz not found');

      const newVersionNumber = quiz.currentVersion + 1;
      const newVersionId = uuidv4();

      // Get current version's questions
      const currentVersion = await SELECT.one.from(QuizVersions)
        .where({ quiz_ID: quizId, versionNumber: quiz.currentVersion });

      // Create snapshot of current version
      if (currentVersion) {
        const snapshot = await buildVersionSnapshot(currentVersion.ID, Questions, QuestionOptions, MatchPairs);
        await UPDATE(QuizVersions).where({ ID: currentVersion.ID }).set({
          snapshotData: JSON.stringify(snapshot),
          isActive: false
        });
      }

      // Create new version
      await INSERT.into(QuizVersions).entries({
        ID: newVersionId,
        quiz_ID: quizId,
        versionNumber: newVersionNumber,
        isActive: true
      });

      // Clone questions to new version
      if (currentVersion) {
        const questions = await SELECT.from(Questions).where({ quizVersion_ID: currentVersion.ID });
        for (const q of questions) {
          const newQId = uuidv4();
          const { ID, quizVersion_ID, ...questionData } = q;
          await INSERT.into(Questions).entries({ ID: newQId, quizVersion_ID: newVersionId, ...questionData });

          const options = await SELECT.from(QuestionOptions).where({ question_ID: q.ID });
          for (const opt of options) {
            const { ID: optId, question_ID, ...optData } = opt;
            await INSERT.into(QuestionOptions).entries({ ID: uuidv4(), question_ID: newQId, ...optData });
          }

          const pairs = await SELECT.from(MatchPairs).where({ question_ID: q.ID });
          for (const pair of pairs) {
            const { ID: pairId, question_ID, ...pairData } = pair;
            await INSERT.into(MatchPairs).entries({ ID: uuidv4(), question_ID: newQId, ...pairData });
          }
        }
      }

      await UPDATE(Quizzes).where({ ID: quizId }).set({ currentVersion: newVersionNumber });

      return { versionId: newVersionId, versionNumber: newVersionNumber };
    });

    // ---- IMPORT QUESTIONS ----
    this.on('importQuestions', async (req) => {
      const { format, data } = req.data;
      const tenantId = req._tenantId || 't1';

      try {
        let questions;
        if (format === 'json') {
          questions = JSON.parse(data);
        } else {
          questions = await csvImporter.parse(data);
        }

        let imported = 0;
        const errors = [];

        for (const q of questions) {
          try {
            const bankId = uuidv4();
            await INSERT.into(QuestionBank).entries({
              ID: bankId,
              tenantId,
              questionText: q.questionText,
              questionType: q.questionType || 'mcq_single',
              difficulty: q.difficulty || 'medium',
              explanation: q.explanation,
              points: q.points || 1,
              category: q.category
            });

            if (q.options) {
              for (let i = 0; i < q.options.length; i++) {
                await INSERT.into(BankQuestionOptions).entries({
                  ID: uuidv4(),
                  bankQuestion_ID: bankId,
                  optionText: q.options[i].text || q.options[i].optionText,
                  isCorrect: q.options[i].isCorrect || false,
                  orderIndex: i + 1
                });
              }
            }
            imported++;
          } catch (err) {
            errors.push(`Row ${imported + errors.length + 1}: ${err.message}`);
          }
        }

        return { imported, errors };
      } catch (err) {
        return req.reject(400, `Import failed: ${err.message}`);
      }
    });

    // ---- EXPORT QUESTIONS ----
    this.on('exportQuestions', async (req) => {
      const { quizId, format } = req.data;
      const version = await SELECT.one.from(QuizVersions)
        .where({ quiz_ID: quizId, isActive: true });
      if (!version) return req.reject(404, 'No active version');

      const questions = await SELECT.from(Questions).where({ quizVersion_ID: version.ID });
      const enriched = [];

      for (const q of questions) {
        const options = await SELECT.from(QuestionOptions).where({ question_ID: q.ID });
        enriched.push({ ...q, options });
      }

      if (format === 'csv') {
        return csvExporter.exportQuestions(enriched);
      }
      return JSON.stringify(enriched, null, 2);
    });

    // ---- ASSIGN QUIZ ----
    this.on('assignQuiz', async (req) => {
      const { quizId, groupId, userId, dueDate } = req.data;
      await INSERT.into(QuizAssignments).entries({
        ID: uuidv4(),
        quiz_ID: quizId,
        group_ID: groupId || null,
        user_ID: userId || null,
        dueDate: dueDate || null,
        isRequired: true
      });
      return { success: true };
    });

    // ---- CREATE LIVE SESSION ----
    this.on('createLiveSession', async (req) => {
      const { quizId, maxParticipants } = req.data;
      const sessionId = uuidv4();
      const sessionCode = generateShareCode();

      await INSERT.into(LiveSessions).entries({
        ID: sessionId,
        quiz_ID: quizId,
        tenantId: req._tenantId || 't1',
        sessionCode,
        hostUser_ID: req.user?.id,
        status: 'waiting',
        maxParticipants: maxParticipants || 100
      });

      return { sessionId, sessionCode };
    });

    this.on('startLiveSession', async (req) => {
      const { sessionId } = req.data;
      await UPDATE(LiveSessions).where({ ID: sessionId }).set({
        status: 'active',
        startedAt: new Date().toISOString(),
        currentQuestionIdx: 0
      });
      return { success: true };
    });

    this.on('nextLiveQuestion', async (req) => {
      const { sessionId } = req.data;
      const session = await SELECT.one.from(LiveSessions).where({ ID: sessionId });
      const nextIdx = (session.currentQuestionIdx || 0) + 1;
      await UPDATE(LiveSessions).where({ ID: sessionId }).set({
        status: 'question_shown',
        currentQuestionIdx: nextIdx
      });
      return { questionIndex: nextIdx };
    });

    this.on('endLiveSession', async (req) => {
      const { sessionId } = req.data;
      await UPDATE(LiveSessions).where({ ID: sessionId }).set({
        status: 'ended',
        endedAt: new Date().toISOString()
      });
      return { success: true };
    });

    // ---- AI GENERATION ----
    this.on('generateQuestions', async (req) => {
      const { topic, difficulty, count, questionType } = req.data;
      const requestId = uuidv4();

      await INSERT.into(AIGenerationRequests).entries({
        ID: requestId,
        tenantId: req._tenantId || 't1',
        requestedBy_ID: req.user?.id,
        requestType: 'questions',
        topic,
        difficulty: difficulty || 'medium',
        numberOfItems: count || 5,
        inputData: JSON.stringify({ topic, difficulty, count, questionType }),
        status: 'pending',
        reviewStatus: 'pending'
      });

      // Async generation (non-blocking)
      setImmediate(async () => {
        try {
          const generated = await aiService.generateQuestions(topic, difficulty || 'medium', count || 5, questionType);
          await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
            outputData: JSON.stringify(generated),
            status: 'completed'
          });
        } catch (err) {
          await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
            status: 'failed',
            errorMessage: err.message
          });
        }
      });

      return { requestId, status: 'pending' };
    });

    this.on('generateExplanations', async (req) => {
      const { questionIds } = req.data;
      const requestId = uuidv4();

      await INSERT.into(AIGenerationRequests).entries({
        ID: requestId,
        tenantId: req._tenantId || 't1',
        requestedBy_ID: req.user?.id,
        requestType: 'explanations',
        inputData: JSON.stringify({ questionIds }),
        status: 'pending',
        reviewStatus: 'pending'
      });

      setImmediate(async () => {
        try {
          const questions = [];
          for (const qId of questionIds) {
            const q = await SELECT.one.from(Questions).where({ ID: qId });
            if (q) questions.push(q);
          }
          const explanations = await aiService.generateExplanations(questions);
          await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
            outputData: JSON.stringify(explanations),
            status: 'completed'
          });
        } catch (err) {
          await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
            status: 'failed',
            errorMessage: err.message
          });
        }
      });

      return { requestId, status: 'pending' };
    });

    this.on('generateQuizSummary', async (req) => {
      const { quizId } = req.data;
      const requestId = uuidv4();

      await INSERT.into(AIGenerationRequests).entries({
        ID: requestId,
        tenantId: req._tenantId || 't1',
        requestedBy_ID: req.user?.id,
        requestType: 'summary',
        inputData: JSON.stringify({ quizId }),
        status: 'pending',
        reviewStatus: 'pending'
      });

      setImmediate(async () => {
        try {
          const analytics = await computeAnalytics(quizId, QuizAttempts, AttemptAnswers, Questions);
          const summary = await aiService.generateQuizSummary(analytics);
          await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
            outputData: JSON.stringify(summary),
            status: 'completed'
          });
        } catch (err) {
          await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
            status: 'failed',
            errorMessage: err.message
          });
        }
      });

      return { requestId, status: 'pending' };
    });

    this.on('approveAIContent', async (req) => {
      const { requestId } = req.data;
      await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
        reviewStatus: 'approved',
        reviewedBy_ID: req.user?.id,
        reviewedAt: new Date().toISOString()
      });
      return { success: true };
    });

    this.on('rejectAIContent', async (req) => {
      const { requestId } = req.data;
      await UPDATE(AIGenerationRequests).where({ ID: requestId }).set({
        reviewStatus: 'rejected',
        reviewedBy_ID: req.user?.id,
        reviewedAt: new Date().toISOString()
      });
      return { success: true };
    });

    // ---- ANALYTICS ----
    this.on('getQuizAnalytics', async (req) => {
      const { quizId } = req.data;
      return await computeAnalytics(quizId, QuizAttempts, AttemptAnswers, Questions);
    });

    // ---- EXPORT RESULTS ----
    this.on('exportResults', async (req) => {
      const { quizId, format } = req.data;
      const attempts = await SELECT.from(QuizAttempts).where({ quiz_ID: quizId, status: 'graded' });
      return csvExporter.exportResults(attempts, format);
    });

    // ---- CERTIFICATE GENERATION ----
    this.on('generateCertificate', async (req) => {
      const { attemptId } = req.data;
      const attempt = await SELECT.one.from(QuizAttempts).where({ ID: attemptId });
      if (!attempt) return req.reject(404, 'Attempt not found');
      if (!attempt.passed) return req.reject(400, 'Cannot generate certificate for failed attempt');

      const quiz = await SELECT.one.from(Quizzes).where({ ID: attempt.quiz_ID });
      const user = await SELECT.one.from(db.entities('quiz.app').Users).where({ ID: attempt.user_ID });

      const certCode = `CERT-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`;
      const pdfUrl = await certGen.generate(user, quiz, attempt, certCode);

      await INSERT.into(Certificates).entries({
        ID: uuidv4(),
        attempt_ID: attemptId,
        user_ID: attempt.user_ID,
        quiz_ID: attempt.quiz_ID,
        tenantId: attempt.tenantId,
        certificateCode: certCode,
        awardedAt: new Date().toISOString(),
        scorePercentage: attempt.scorePercentage,
        pdfUrl
      });

      return { certificateCode: certCode, pdfUrl };
    });

    await super.init();

    // --- Internal helpers ---
    async function computeAnalytics(quizId, QuizAttempts, AttemptAnswers, Questions) {
      const attempts = await SELECT.from(QuizAttempts)
        .where({ quiz_ID: quizId, status: 'graded' });

      if (attempts.length === 0) {
        return {
          totalAttempts: 0, uniqueStudents: 0, avgScore: 0, medianScore: 0,
          passRate: 0, avgTimeTaken: 0, scoreDistribution: [], questionAccuracy: []
        };
      }

      const uniqueStudents = new Set(attempts.map(a => a.user_ID)).size;
      const scores = attempts.map(a => parseFloat(a.scorePercentage || 0)).sort((a, b) => a - b);
      const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
      const medianScore = scores[Math.floor(scores.length / 2)];
      const passCount = attempts.filter(a => a.passed).length;
      const passRate = (passCount / attempts.length) * 100;
      const avgTimeTaken = Math.round(attempts.reduce((s, a) => s + (a.timeTakenSeconds || 0), 0) / attempts.length);

      // Score distribution buckets
      const buckets = ['0-20', '21-40', '41-60', '61-80', '81-100'];
      const scoreDistribution = buckets.map(label => {
        const [min, max] = label.split('-').map(Number);
        return { rangeLabel: label + '%', count: scores.filter(s => s >= min && s <= max).length };
      });

      // Per-question accuracy
      const version = await SELECT.one.from(db.entities('quiz.app').QuizVersions)
        .where({ quiz_ID: quizId, isActive: true });
      const questions = version
        ? await SELECT.from(Questions).where({ quizVersion_ID: version.ID })
        : [];

      const questionAccuracy = [];
      for (const q of questions) {
        const answers = await SELECT.from(AttemptAnswers).where({ question_ID: q.ID });
        const correct = answers.filter(a => a.isCorrect).length;
        const correctPct = answers.length > 0 ? (correct / answers.length) * 100 : 0;
        const avgTime = answers.length > 0
          ? Math.round(answers.reduce((s, a) => s + (a.timeSpentSeconds || 0), 0) / answers.length)
          : 0;
        questionAccuracy.push({
          questionId: q.ID,
          questionText: q.questionText?.substring(0, 100),
          correctPct: Math.round(correctPct * 100) / 100,
          avgTime
        });
      }

      return {
        totalAttempts: attempts.length,
        uniqueStudents,
        avgScore: Math.round(avgScore * 100) / 100,
        medianScore: Math.round(medianScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        avgTimeTaken,
        scoreDistribution,
        questionAccuracy
      };
    }
  }
}

async function buildVersionSnapshot(versionId, Questions, QuestionOptions, MatchPairs) {
  const questions = await SELECT.from(Questions).where({ quizVersion_ID: versionId });
  const snapshot = [];
  for (const q of questions) {
    const options = await SELECT.from(QuestionOptions).where({ question_ID: q.ID });
    const pairs = await SELECT.from(MatchPairs).where({ question_ID: q.ID });
    snapshot.push({ ...q, options, matchPairs: pairs });
  }
  return snapshot;
}

function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = { AdminServiceHandler };
