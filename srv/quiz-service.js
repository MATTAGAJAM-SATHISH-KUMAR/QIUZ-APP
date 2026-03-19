// ============================================================================
// Quiz Service Handler — Student-facing: take quizzes, submit answers, results
// Standard CAP handler pattern: module.exports = cds.service.impl(...)
// ============================================================================
const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');
const { ScoringEngine } = require('./handlers/lib/scoring-engine');
const { getAuditLogger } = require('./handlers/lib/audit-logger');

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to('db');
  const {
    Quizzes, QuizVersions, Questions, QuestionOptions, MatchPairs,
    QuizAttempts, AttemptAnswers, LiveSessions, LiveParticipants
  } = db.entities('quiz.app');
  const audit = getAuditLogger(db);
  const scoring = new ScoringEngine();

  // ---- START ATTEMPT ----
  this.on('startAttempt', async (req) => {
    const { quizId, accessCode } = req.data;
    const userId = req.user.id;

    const quiz = await SELECT.one.from(Quizzes).where({ ID: quizId, status: 'published' });
    if (!quiz) return req.reject(404, 'Quiz not found or not available');

    // Check schedule window
    const now = new Date();
    if (quiz.scheduledStart && new Date(quiz.scheduledStart) > now) {
      return req.reject(403, 'Quiz has not started yet');
    }
    if (quiz.scheduledEnd && new Date(quiz.scheduledEnd) < now) {
      return req.reject(403, 'Quiz submission window has ended');
    }

    // Check access code
    if (quiz.requiresAccessCode && quiz.accessCode !== accessCode) {
      return req.reject(403, 'Invalid access code');
    }

    // Check attempts limit
    const existingAttempts = await SELECT.from(QuizAttempts)
      .where({ quiz_ID: quizId, user_ID: userId })
      .orderBy('attemptNumber desc');

    if (quiz.attemptsAllowed > 0 && existingAttempts.length >= quiz.attemptsAllowed) {
      return req.reject(403, `Maximum attempts (${quiz.attemptsAllowed}) reached`);
    }

    // Check for in-progress attempt (resume instead)
    const inProgress = existingAttempts.find(a => a.status === 'in_progress');
    if (inProgress && quiz.allowResume) {
      return await buildAttemptView(inProgress, quiz, QuizVersions, Questions, QuestionOptions, MatchPairs, AttemptAnswers);
    }
    if (inProgress) {
      await UPDATE(QuizAttempts).where({ ID: inProgress.ID }).set({ status: 'expired' });
    }

    // Get active version
    const version = await SELECT.one.from(QuizVersions)
      .where({ quiz_ID: quizId, isActive: true })
      .orderBy('versionNumber desc');
    if (!version) return req.reject(500, 'Quiz has no active version');

    // Create attempt
    const attemptId = uuidv4();
    const attemptNumber = existingAttempts.length + 1;

    await INSERT.into(QuizAttempts).entries({
      ID: attemptId,
      quiz_ID: quizId,
      quizVersion_ID: version.ID,
      user_ID: userId,
      tenantId: quiz.tenantId,
      attemptNumber,
      status: 'in_progress',
      startedAt: now.toISOString(),
      ipAddress: req.headers?.['x-forwarded-for'] || 'unknown',
      userAgent: req.headers?.['user-agent'] || 'unknown'
    });

    const attempt = await SELECT.one.from(QuizAttempts).where({ ID: attemptId });
    return await buildAttemptView(attempt, quiz, QuizVersions, Questions, QuestionOptions, MatchPairs, AttemptAnswers);
  });

  // ---- RESUME ATTEMPT ----
  this.on('resumeAttempt', async (req) => {
    const { attemptId } = req.data;
    const userId = req.user.id;

    const attempt = await SELECT.one.from(QuizAttempts)
      .where({ ID: attemptId, user_ID: userId, status: 'in_progress' });
    if (!attempt) return req.reject(404, 'No active attempt found');

    const quiz = await SELECT.one.from(Quizzes).where({ ID: attempt.quiz_ID });
    if (!quiz) return req.reject(404, 'Quiz not found');

    // Check if time has expired
    if (quiz.timeLimitMinutes) {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
      if (elapsed > quiz.timeLimitMinutes * 60) {
        return await autoSubmit(attempt, quiz);
      }
    }

    return await buildAttemptView(attempt, quiz, QuizVersions, Questions, QuestionOptions, MatchPairs, AttemptAnswers);
  });

  // ---- SAVE ANSWER (per-question auto-save) ----
  this.on('saveAnswer', async (req) => {
    const { attemptId, questionId, selectedOptions, fillBlankAnswer, matchingAnswer, timeSpentSeconds } = req.data;
    const userId = req.user.id;

    const attempt = await SELECT.one.from(QuizAttempts)
      .where({ ID: attemptId, user_ID: userId, status: 'in_progress' });
    if (!attempt) return req.reject(403, 'Invalid or completed attempt');

    // Check time limit
    const quiz = await SELECT.one.from(Quizzes).where({ ID: attempt.quiz_ID });
    if (quiz.timeLimitMinutes) {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
      if (elapsed > quiz.timeLimitMinutes * 60) {
        await autoSubmit(attempt, quiz);
        return req.reject(403, 'Time has expired. Quiz auto-submitted.');
      }
    }

    // Upsert answer
    const existing = await SELECT.one.from(AttemptAnswers)
      .where({ attempt_ID: attemptId, question_ID: questionId });

    const answerData = {
      selectedOptions: selectedOptions ? JSON.stringify(selectedOptions) : null,
      fillBlankAnswer,
      matchingAnswer,
      timeSpentSeconds: timeSpentSeconds || 0,
      answeredAt: new Date().toISOString()
    };

    if (existing) {
      await UPDATE(AttemptAnswers).where({ ID: existing.ID }).set(answerData);
    } else {
      await INSERT.into(AttemptAnswers).entries({
        ID: uuidv4(),
        attempt_ID: attemptId,
        question_ID: questionId,
        ...answerData
      });
    }

    return { saved: true };
  });

  // ---- SUBMIT ATTEMPT ----
  this.on('submitAttempt', async (req) => {
    const { attemptId } = req.data;
    const userId = req.user.id;

    const attempt = await SELECT.one.from(QuizAttempts)
      .where({ ID: attemptId, user_ID: userId, status: 'in_progress' });
    if (!attempt) return req.reject(404, 'No active attempt found');

    const quiz = await SELECT.one.from(Quizzes).where({ ID: attempt.quiz_ID });
    const result = await gradeAndFinalize(attempt, quiz);

    await audit.log('quiz.submitted', 'QuizAttempts', attemptId, null, {
      quizId: quiz.ID, userId, score: result.scorePercentage
    });

    return {
      attemptId: attempt.ID,
      totalScore: result.totalScore,
      maxPossibleScore: result.maxPossibleScore,
      scorePercentage: result.scorePercentage,
      passed: result.passed,
      timeTakenSeconds: result.timeTakenSeconds,
      showDetails: quiz.showResultMode === 'immediate'
    };
  });

  // ---- JOIN BY SHARE CODE ----
  this.on('joinByCode', async (req) => {
    const { shareCode, accessCode } = req.data;
    const quiz = await SELECT.one.from(Quizzes)
      .where({ shareCode, status: 'published' });
    if (!quiz) return req.reject(404, 'Quiz not found');

    if (quiz.requiresAccessCode && quiz.accessCode !== accessCode) {
      return req.reject(403, 'Invalid access code');
    }

    return { quizId: quiz.ID, title: quiz.title };
  });

  // ---- JOIN LIVE SESSION ----
  this.on('joinLiveSession', async (req) => {
    const { sessionCode, nickname } = req.data;
    const userId = req.user.id;

    const session = await SELECT.one.from(LiveSessions)
      .where({ sessionCode, status: ['waiting', 'active', 'question_shown'] });
    if (!session) return req.reject(404, 'Session not found or ended');

    const count = await SELECT.one.from(LiveParticipants)
      .columns('count(*) as cnt')
      .where({ session_ID: session.ID });
    if (count.cnt >= session.maxParticipants) {
      return req.reject(403, 'Session is full');
    }

    const existing = await SELECT.one.from(LiveParticipants)
      .where({ session_ID: session.ID, user_ID: userId });
    if (existing) {
      return { sessionId: session.ID, participantId: existing.ID };
    }

    const participantId = uuidv4();
    await INSERT.into(LiveParticipants).entries({
      ID: participantId,
      session_ID: session.ID,
      user_ID: userId,
      nickname: nickname || 'Anonymous',
      isConnected: true
    });

    return { sessionId: session.ID, participantId };
  });

  // --- Internal helpers ---

  async function gradeAndFinalize(attempt, quiz) {
    const questions = await SELECT.from(Questions).where({ quizVersion_ID: attempt.quizVersion_ID });
    const answers = await SELECT.from(AttemptAnswers).where({ attempt_ID: attempt.ID });

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const question of questions) {
      maxPossibleScore += parseFloat(question.points || 1);
      const answer = answers.find(a => a.question_ID === question.ID);
      if (!answer) continue;

      const options = await SELECT.from(QuestionOptions).where({ question_ID: question.ID });
      const result = scoring.gradeQuestion(question, options, answer, quiz.negativeMarking, quiz.negativeMarkPct);

      totalScore += result.pointsAwarded;
      await UPDATE(AttemptAnswers).where({ ID: answer.ID }).set({
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded
      });
    }

    totalScore = Math.max(0, totalScore);
    const scorePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const passed = scorePercentage >= parseFloat(quiz.passingScorePct || 0);
    const timeTakenSeconds = Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);

    await UPDATE(QuizAttempts).where({ ID: attempt.ID }).set({
      status: 'graded',
      submittedAt: new Date().toISOString(),
      totalScore,
      maxPossibleScore,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      passed,
      timeTakenSeconds
    });

    return { totalScore, maxPossibleScore, scorePercentage: Math.round(scorePercentage * 100) / 100, passed, timeTakenSeconds };
  }

  async function autoSubmit(attempt, quiz) {
    return await gradeAndFinalize(attempt, quiz);
  }
});

// Build the quiz view sent to the student (questions without correct answers)
async function buildAttemptView(attempt, quiz, QuizVersions, Questions, QuestionOptions, MatchPairs, AttemptAnswers) {
  const version = await SELECT.one.from(QuizVersions).where({ ID: attempt.quizVersion_ID });
  let questions = await SELECT.from(Questions).where({ quizVersion_ID: version.ID }).orderBy('orderIndex');

  if (quiz.randomizeQuestions) {
    questions = shuffleArray(questions);
  }

  const questionViews = [];
  for (const q of questions) {
    let options = await SELECT.from(QuestionOptions).where({ question_ID: q.ID }).orderBy('orderIndex');

    if (quiz.randomizeOptions && q.questionType !== 'true_false') {
      options = shuffleArray(options);
    }

    const savedAnswer = await SELECT.one.from(AttemptAnswers)
      .where({ attempt_ID: attempt.ID, question_ID: q.ID });

    questionViews.push({
      id: q.ID,
      questionText: q.questionText,
      questionType: q.questionType,
      points: q.points,
      orderIndex: q.orderIndex,
      mediaUrl: q.mediaUrl,
      options: options.map(o => ({
        id: o.ID,
        optionText: o.optionText,
        orderIndex: o.orderIndex,
        mediaUrl: o.mediaUrl
      })),
      matchPairs: q.questionType === 'matching'
        ? (await SELECT.from(MatchPairs).where({ question_ID: q.ID })).map(mp => ({
            id: mp.ID, leftItem: mp.leftItem, rightItem: mp.rightItem
          }))
        : [],
      savedAnswer: savedAnswer ? (savedAnswer.selectedOptions || savedAnswer.fillBlankAnswer || savedAnswer.matchingAnswer) : null
    });
  }

  return {
    attemptId: attempt.ID,
    quizTitle: quiz.title,
    timeLimit: quiz.timeLimitMinutes,
    startedAt: attempt.startedAt,
    questions: questionViews
  };
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
