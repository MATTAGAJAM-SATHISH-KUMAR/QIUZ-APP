// ============================================================================
// Quiz Service — Student-facing APIs for taking quizzes and viewing results
// ============================================================================
using { quiz.app as db } from '../db/schema';

service QuizService @(path: '/api/quiz') {

  // --- Browsable quizzes (published, assigned, or shared) ---
  @readonly
  entity AvailableQuizzes as projection on db.Quizzes {
    ID, title, description, category, difficulty,
    timeLimitMinutes, passingScorePct, attemptsAllowed,
    scoringRule, randomizeQuestions, randomizeOptions,
    showResultMode, showExplanations, allowResume,
    antiCheatCopyPaste, antiCheatFullScreen,
    status, scheduledStart, scheduledEnd, shareCode,
    currentVersion
  } where status = 'published';

  // --- Start / resume a quiz attempt ---
  action startAttempt(quizId: UUID, accessCode: String) returns QuizAttemptView;
  action resumeAttempt(attemptId: UUID)                  returns QuizAttemptView;

  // --- Submit answer for a single question (auto-save) ---
  action saveAnswer(
    attemptId: UUID,
    questionId: UUID,
    selectedOptions: array of UUID,
    fillBlankAnswer: String,
    matchingAnswer: String,
    timeSpentSeconds: Integer
  ) returns { saved: Boolean };

  // --- Submit entire quiz ---
  action submitAttempt(attemptId: UUID) returns AttemptResult;

  // --- View results & review ---
  @readonly
  entity MyAttempts as projection on db.QuizAttempts {
    *, quiz.title as quizTitle, quiz.category as quizCategory
  };

  @readonly
  entity AttemptReview as projection on db.AttemptAnswers {
    *, question.questionText, question.explanation, question.questionType, question.points
  };

  // --- Join quiz via share code ---
  action joinByCode(shareCode: String, accessCode: String) returns {
    quizId: UUID;
    title: String;
  };

  // --- Live session ---
  action joinLiveSession(sessionCode: String, nickname: String) returns {
    sessionId: UUID;
    participantId: UUID;
  };

  // Type definitions for return types
  type QuizAttemptView {
    attemptId   : UUID;
    quizTitle   : String;
    timeLimit   : Integer;
    startedAt   : Timestamp;
    questions   : array of QuizQuestionView;
  }

  type QuizQuestionView {
    id           : UUID;
    questionText : String;
    questionType : String;
    points       : Decimal;
    orderIndex   : Integer;
    mediaUrl     : String;
    options      : array of QuizOptionView;
    matchPairs   : array of MatchPairView;
    savedAnswer  : String;  // Previously saved answer (for resume)
  }

  type QuizOptionView {
    id         : UUID;
    optionText : String;
    orderIndex : Integer;
    mediaUrl   : String;
    // NOTE: isCorrect is deliberately excluded — never sent before submission
  }

  type MatchPairView {
    id        : UUID;
    leftItem  : String;
    rightItem : String;
  }

  type AttemptResult {
    attemptId       : UUID;
    totalScore      : Decimal;
    maxPossibleScore: Decimal;
    scorePercentage : Decimal;
    passed          : Boolean;
    timeTakenSeconds: Integer;
    showDetails     : Boolean;  // Whether to show question-level details
  }
}


