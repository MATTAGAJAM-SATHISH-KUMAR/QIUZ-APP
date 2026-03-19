// ============================================================================
// Quiz App – Core Data Model (SAP BTP CAP / CAPM)
// Multi-tenant via @sap/cds-mtxs, auth via XSUAA
// ============================================================================
namespace quiz.app;

using { cuid, managed } from '@sap/cds/common';

// --------------------------------------------------------------------------
// TENANT & USER PROFILE MANAGEMENT
// --------------------------------------------------------------------------
// Note: Authentication is handled by SAP XSUAA / IAS.
// The Users entity stores profile metadata only (no passwords).
// Tenant isolation is handled by CAP's built-in multitenancy (@sap/cds-mtxs).

entity Tenants : cuid, managed {
  name        : String(200) not null;
  slug        : String(100) not null;
  plan        : String(50) default 'free';   // free | pro | enterprise
  isActive    : Boolean default true;
  settings    : LargeString;                  // JSON tenant-level config
  users       : Composition of many Users on users.tenant = $self;
  groups      : Composition of many Groups on groups.tenant = $self;
}

entity Users : cuid, managed {
  email       : String(255) not null;
  firstName   : String(100);
  lastName    : String(100);
  role        : String(20) not null;          // Admin | Instructor | Student
  isActive    : Boolean default true;
  avatarUrl   : String(500);
  lastLoginAt : Timestamp;
  tenant      : Association to Tenants;
  groupMembers: Composition of many GroupMembers on groupMembers.user = $self;
  attempts    : Composition of many QuizAttempts on attempts.user = $self;
}

// --------------------------------------------------------------------------
// GROUPS & ASSIGNMENTS
// --------------------------------------------------------------------------

entity Groups : cuid, managed {
  name        : String(200) not null;
  description : String(1000);
  tenant      : Association to Tenants;
  members     : Composition of many GroupMembers on members.group = $self;
  assignments : Composition of many QuizAssignments on assignments.group = $self;
}

entity GroupMembers : cuid {
  group       : Association to Groups;
  user        : Association to Users;
  joinedAt    : Timestamp default $now;
}

// --------------------------------------------------------------------------
// QUIZ & QUESTION BANK
// --------------------------------------------------------------------------

entity Quizzes : cuid, managed {
  tenantId        : UUID not null;            // Multi-tenant isolation
  title           : String(500) not null;
  description     : LargeString;
  category        : String(200);
  difficulty      : String(20);               // easy | medium | hard | expert
  timeLimitMinutes: Integer;                  // null = unlimited
  passingScorePct : Decimal(5,2) default 60;
  attemptsAllowed : Integer default 1;        // 0 = unlimited
  scoringRule     : String(20) default 'best'; // best | latest | average
  negativeMarking : Boolean default false;
  negativeMarkPct : Decimal(5,2) default 25;  // % of question marks deducted
  randomizeQuestions: Boolean default false;
  randomizeOptions: Boolean default false;
  showResultMode  : String(20) default 'immediate'; // immediate | after_review | after_end
  showExplanations: Boolean default true;
  allowResume     : Boolean default true;
  antiCheatCopyPaste: Boolean default false;
  antiCheatFullScreen: Boolean default false;
  status          : String(20) default 'draft'; // draft | published | archived
  scheduledStart  : Timestamp;
  scheduledEnd    : Timestamp;
  shareCode       : String(20);               // Public share code
  requiresAccessCode: Boolean default false;
  accessCode      : String(50);
  currentVersion  : Integer default 1;
  author          : Association to Users;     // Quiz creator (createdBy is reserved by managed aspect)
  versions        : Composition of many QuizVersions on versions.quiz = $self;
  assignments     : Composition of many QuizAssignments on assignments.quiz = $self;
  liveSessions    : Composition of many LiveSessions on liveSessions.quiz = $self;
}

entity QuizVersions : cuid, managed {
  quiz            : Association to Quizzes;
  versionNumber   : Integer not null;
  snapshotData    : LargeString;              // Full JSON snapshot for immutability
  questions       : Composition of many Questions on questions.quizVersion = $self;
  isActive        : Boolean default true;
}

entity Questions : cuid, managed {
  quizVersion     : Association to QuizVersions;
  questionBank    : Association to QuestionBank; // link to bank if sourced from there
  tenantId        : UUID not null;
  questionText    : LargeString not null;
  questionType    : String(30) not null;      // mcq_single | mcq_multi | true_false | fill_blank | matching
  points          : Decimal(6,2) default 1;
  orderIndex      : Integer default 0;
  explanation     : LargeString;              // Shown after answering
  mediaUrl        : String(500);              // Image/video attachment
  options         : Composition of many QuestionOptions on options.question = $self;
  matchPairs      : Composition of many MatchPairs on matchPairs.question = $self;
  tags            : Composition of many QuestionTagLinks on tags.question = $self;
}

entity QuestionOptions : cuid {
  question        : Association to Questions;
  optionText      : LargeString not null;
  isCorrect       : Boolean default false;
  orderIndex      : Integer default 0;
  mediaUrl        : String(500);
}

entity MatchPairs : cuid {
  question        : Association to Questions;
  leftItem        : String(500) not null;
  rightItem       : String(500) not null;
  orderIndex      : Integer default 0;
}

// --------------------------------------------------------------------------
// QUESTION BANK (Reusable questions across quizzes)
// --------------------------------------------------------------------------

entity QuestionBank : cuid, managed {
  tenantId        : UUID not null;
  questionText    : LargeString not null;
  questionType    : String(30) not null;
  difficulty      : String(20);
  explanation     : LargeString;
  points          : Decimal(6,2) default 1;
  category        : String(200);
  mediaUrl        : String(500);
  options         : Composition of many BankQuestionOptions on options.bankQuestion = $self;
  matchPairs      : Composition of many BankMatchPairs on matchPairs.bankQuestion = $self;
  tags            : Composition of many BankQuestionTagLinks on tags.bankQuestion = $self;
  usageCount      : Integer default 0;
  aiGenerated     : Boolean default false;
  reviewStatus    : String(20) default 'approved'; // pending | approved | rejected
}

entity BankQuestionOptions : cuid {
  bankQuestion    : Association to QuestionBank;
  optionText      : LargeString not null;
  isCorrect       : Boolean default false;
  orderIndex      : Integer default 0;
}

entity BankMatchPairs : cuid {
  bankQuestion    : Association to QuestionBank;
  leftItem        : String(500) not null;
  rightItem       : String(500) not null;
  orderIndex      : Integer default 0;
}

// --------------------------------------------------------------------------
// TAGS
// --------------------------------------------------------------------------

entity Tags : cuid {
  tenantId        : UUID not null;
  name            : String(100) not null;
  color           : String(7);                // hex color
}

entity QuestionTagLinks : cuid {
  question        : Association to Questions;
  tag             : Association to Tags;
}

entity BankQuestionTagLinks : cuid {
  bankQuestion    : Association to QuestionBank;
  tag             : Association to Tags;
}

// --------------------------------------------------------------------------
// QUIZ ASSIGNMENTS
// --------------------------------------------------------------------------

entity QuizAssignments : cuid, managed {
  quiz            : Association to Quizzes;
  group           : Association to Groups;
  user            : Association to Users;     // Direct user assignment (null if group)
  assignedAt      : Timestamp default $now;
  dueDate         : Timestamp;
  isRequired      : Boolean default false;
}

// --------------------------------------------------------------------------
// QUIZ ATTEMPTS & ANSWERS
// --------------------------------------------------------------------------

entity QuizAttempts : cuid, managed {
  quiz            : Association to Quizzes;
  quizVersion     : Association to QuizVersions;
  user            : Association to Users;
  tenantId        : UUID not null;
  attemptNumber   : Integer default 1;
  status          : String(20) default 'in_progress'; // in_progress | submitted | graded | expired
  startedAt       : Timestamp not null;
  submittedAt     : Timestamp;
  totalScore      : Decimal(8,2);
  maxPossibleScore: Decimal(8,2);
  scorePercentage : Decimal(5,2);
  passed          : Boolean;
  timeTakenSeconds: Integer;
  ipAddress       : String(45);
  userAgent       : String(500);
  answers         : Composition of many AttemptAnswers on answers.attempt = $self;
  certificateId   : String(100);              // Generated certificate reference
}

entity AttemptAnswers : cuid {
  attempt         : Association to QuizAttempts;
  question        : Association to Questions;
  selectedOptions : LargeString;              // JSON array of option IDs
  fillBlankAnswer : String(1000);
  matchingAnswer  : LargeString;              // JSON for matching pairs
  isCorrect       : Boolean;
  pointsAwarded   : Decimal(6,2) default 0;
  timeSpentSeconds: Integer;
  answeredAt      : Timestamp;
}

// --------------------------------------------------------------------------
// LIVE QUIZ SESSIONS
// --------------------------------------------------------------------------

entity LiveSessions : cuid, managed {
  quiz            : Association to Quizzes;
  tenantId        : UUID not null;
  sessionCode     : String(10) not null;      // Join code (e.g., "ABC123")
  hostUser        : Association to Users;
  status          : String(20) default 'waiting'; // waiting | active | question_shown | paused | ended
  currentQuestionIdx: Integer default 0;
  maxParticipants : Integer default 100;
  startedAt       : Timestamp;
  endedAt         : Timestamp;
  participants    : Composition of many LiveParticipants on participants.session = $self;
  leaderboard     : Composition of many LeaderboardEntries on leaderboard.session = $self;
}

entity LiveParticipants : cuid {
  session         : Association to LiveSessions;
  user            : Association to Users;
  nickname        : String(100);
  joinedAt        : Timestamp default $now;
  isConnected     : Boolean default true;
  totalScore      : Decimal(8,2) default 0;
  correctCount    : Integer default 0;
  currentStreak   : Integer default 0;
}

entity LeaderboardEntries : cuid {
  session         : Association to LiveSessions;
  participant     : Association to LiveParticipants;
  questionIndex   : Integer;
  pointsEarned    : Decimal(6,2) default 0;
  answeredInMs    : Integer;                  // Response time in milliseconds
  wasCorrect      : Boolean;
}

// --------------------------------------------------------------------------
// CERTIFICATES
// --------------------------------------------------------------------------

entity Certificates : cuid, managed {
  attempt         : Association to QuizAttempts;
  user            : Association to Users;
  quiz            : Association to Quizzes;
  tenantId        : UUID not null;
  certificateCode : String(50) not null;      // Unique verification code
  awardedAt       : Timestamp not null;
  scorePercentage : Decimal(5,2);
  pdfUrl          : String(500);
}

// --------------------------------------------------------------------------
// AI GENERATION REQUESTS
// --------------------------------------------------------------------------

entity AIGenerationRequests : cuid, managed {
  tenantId        : UUID not null;
  requestedBy     : Association to Users;
  requestType     : String(30) not null;      // questions | explanations | summary
  topic           : String(500);
  difficulty      : String(20);
  numberOfItems   : Integer;
  inputData       : LargeString;              // JSON context
  outputData      : LargeString;              // JSON generated content
  status          : String(20) default 'pending'; // pending | processing | completed | failed
  reviewStatus    : String(20) default 'pending'; // pending | approved | rejected
  reviewedBy      : Association to Users;
  reviewedAt      : Timestamp;
  errorMessage    : LargeString;
}

// --------------------------------------------------------------------------
// AUDIT LOG
// --------------------------------------------------------------------------

entity AuditLogs : cuid {
  tenantId        : UUID not null;
  userId          : UUID;
  userEmail       : String(255);
  action          : String(100) not null;     // quiz.created, quiz.edited, result.changed, etc.
  entityType      : String(100);              // Quiz, Question, QuizAttempt, etc.
  entityId        : UUID;
  oldValue        : LargeString;              // JSON of previous state
  newValue        : LargeString;              // JSON of new state
  ipAddress       : String(45);
  userAgent       : String(500);
  timestamp       : Timestamp default $now;
}
