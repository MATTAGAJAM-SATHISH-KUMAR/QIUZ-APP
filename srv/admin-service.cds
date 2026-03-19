// ============================================================================
// Admin Service — Instructor/Admin APIs for quiz management & analytics
// ============================================================================
using { quiz.app as db } from '../db/schema';

service AdminService @(path: '/api/admin') {

  // --- Full CRUD for Quizzes ---
  entity Quizzes as projection on db.Quizzes;
  entity QuizVersions as projection on db.QuizVersions;
  entity Questions as projection on db.Questions;
  entity QuestionOptions as projection on db.QuestionOptions;
  entity MatchPairs as projection on db.MatchPairs;

  // --- Question Bank ---
  entity QuestionBank as projection on db.QuestionBank;
  entity BankQuestionOptions as projection on db.BankQuestionOptions;
  entity BankMatchPairs as projection on db.BankMatchPairs;

  // --- Tags ---
  entity Tags as projection on db.Tags;

  // --- Groups & Assignments ---
  entity Groups as projection on db.Groups;
  entity GroupMembers as projection on db.GroupMembers;
  entity QuizAssignments as projection on db.QuizAssignments;

  // --- Users (Admin only, read + manage) ---
  entity Users as projection on db.Users {
    ID, email, firstName, lastName, role, isActive, lastLoginAt, tenant
  };

  // --- Results & Attempts (read-only for instructors) ---
  @readonly
  entity QuizAttempts as projection on db.QuizAttempts;
  @readonly
  entity AttemptAnswers as projection on db.AttemptAnswers;

  // --- Certificates ---
  @readonly
  entity Certificates as projection on db.Certificates;

  // --- Audit Log (Admin only) ---
  @readonly
  entity AuditLogs as projection on db.AuditLogs;

  // --- Live Sessions ---
  entity LiveSessions as projection on db.LiveSessions;
  entity LiveParticipants as projection on db.LiveParticipants;
  entity LeaderboardEntries as projection on db.LeaderboardEntries;

  // --- AI Generation ---
  entity AIGenerationRequests as projection on db.AIGenerationRequests;

  // === ACTIONS ===

  // Publish / unpublish quiz
  action publishQuiz(quizId: UUID)   returns { success: Boolean; message: String };
  action unpublishQuiz(quizId: UUID) returns { success: Boolean; message: String };
  action archiveQuiz(quizId: UUID)   returns { success: Boolean; message: String };

  // Create a new version (for editing without breaking existing attempts)
  action createQuizVersion(quizId: UUID) returns { versionId: UUID; versionNumber: Integer };

  // Import/export question bank
  action importQuestions(format: String, data: LargeString) returns {
    imported: Integer;
    errors: array of String;
  };
  action exportQuestions(quizId: UUID, format: String) returns LargeString;

  // Assign quiz to group or user
  action assignQuiz(quizId: UUID, groupId: UUID, userId: UUID, dueDate: Timestamp) returns { success: Boolean };

  // Create live session
  action createLiveSession(quizId: UUID, maxParticipants: Integer) returns {
    sessionId: UUID;
    sessionCode: String;
  };
  action startLiveSession(sessionId: UUID)      returns { success: Boolean };
  action nextLiveQuestion(sessionId: UUID)      returns { questionIndex: Integer };
  action endLiveSession(sessionId: UUID)        returns { success: Boolean };

  // AI generation
  action generateQuestions(topic: String, difficulty: String, count: Integer, questionType: String) returns {
    requestId: UUID;
    status: String;
  };
  action generateExplanations(questionIds: array of UUID) returns {
    requestId: UUID;
    status: String;
  };
  action generateQuizSummary(quizId: UUID) returns {
    requestId: UUID;
    status: String;
  };
  action approveAIContent(requestId: UUID) returns { success: Boolean };
  action rejectAIContent(requestId: UUID)  returns { success: Boolean };

  // Analytics
  action getQuizAnalytics(quizId: UUID) returns QuizAnalytics;
  action exportResults(quizId: UUID, format: String) returns LargeString;

  // Certificate generation
  action generateCertificate(attemptId: UUID) returns { certificateCode: String; pdfUrl: String };

  // Type definitions
  type QuizAnalytics {
    totalAttempts    : Integer;
    uniqueStudents   : Integer;
    avgScore         : Decimal;
    medianScore      : Decimal;
    passRate         : Decimal;
    avgTimeTaken     : Integer;
    scoreDistribution: array of ScoreBucket;
    questionAccuracy : array of QuestionStat;
  }

  type ScoreBucket {
    rangeLabel : String;
    count      : Integer;
  }

  type QuestionStat {
    questionId  : UUID;
    questionText: String;
    correctPct  : Decimal;
    avgTime     : Integer;
  }
}


