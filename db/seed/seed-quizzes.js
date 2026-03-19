/**
 * Seed data loader — populates quizzes, questions, options for development.
 * Run after initial CDS deployment: `cds deploy && node db/seed/seed-quizzes.js`
 */
const cds = require('@sap/cds');

async function seed() {
  const db = await cds.connect.to('db');
  const {
    Quizzes, QuizVersions, Questions, QuestionOptions, MatchPairs
  } = db.entities('quiz.app');

  // ========== QUIZ 1: JavaScript Fundamentals ==========
  const quiz1Id = 'quiz-js-101';
  const qv1Id = 'qv-js-101-v1';

  await INSERT.into(Quizzes).entries({
    ID: quiz1Id,
    tenantId: 't1',
    title: 'JavaScript Fundamentals',
    description: 'Test your knowledge of core JavaScript concepts including variables, functions, closures, and ES6+ features.',
    category: 'Programming',
    difficulty: 'medium',
    timeLimitMinutes: 30,
    passingScorePct: 70,
    attemptsAllowed: 3,
    scoringRule: 'best',
    randomizeQuestions: true,
    randomizeOptions: true,
    showResultMode: 'immediate',
    showExplanations: true,
    status: 'published',
    currentVersion: 1,
    shareCode: 'JS101X',
    createdBy_ID: 'u2'
  });

  await INSERT.into(QuizVersions).entries({
    ID: qv1Id,
    quiz_ID: quiz1Id,
    versionNumber: 1,
    isActive: true
  });

  const jsQuestions = [
    {
      ID: 'q1', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 1, points: 1,
      questionType: 'mcq_single',
      questionText: 'What is the output of `typeof null` in JavaScript?',
      explanation: 'This is a well-known JavaScript quirk. `typeof null` returns "object" due to a legacy bug in the language specification.',
      options: [
        { ID: 'q1o1', optionText: '"null"', isCorrect: false, orderIndex: 1 },
        { ID: 'q1o2', optionText: '"undefined"', isCorrect: false, orderIndex: 2 },
        { ID: 'q1o3', optionText: '"object"', isCorrect: true, orderIndex: 3 },
        { ID: 'q1o4', optionText: '"boolean"', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q2', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 2, points: 1,
      questionType: 'mcq_single',
      questionText: 'Which keyword declares a block-scoped variable in JavaScript?',
      explanation: '`let` and `const` are block-scoped. `var` is function-scoped. `define` is not a JavaScript keyword.',
      options: [
        { ID: 'q2o1', optionText: 'var', isCorrect: false, orderIndex: 1 },
        { ID: 'q2o2', optionText: 'let', isCorrect: true, orderIndex: 2 },
        { ID: 'q2o3', optionText: 'define', isCorrect: false, orderIndex: 3 },
        { ID: 'q2o4', optionText: 'dim', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q3', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 3, points: 1,
      questionType: 'true_false',
      questionText: 'JavaScript is a statically typed language.',
      explanation: 'JavaScript is dynamically typed. TypeScript adds static typing on top of JavaScript.',
      options: [
        { ID: 'q3o1', optionText: 'True', isCorrect: false, orderIndex: 1 },
        { ID: 'q3o2', optionText: 'False', isCorrect: true, orderIndex: 2 }
      ]
    },
    {
      ID: 'q4', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 4, points: 2,
      questionType: 'mcq_multi',
      questionText: 'Which of the following are valid ways to create a function in JavaScript? (Select all that apply)',
      explanation: 'Function declarations, arrow functions, and function expressions are all valid. `lambda` is Python syntax.',
      options: [
        { ID: 'q4o1', optionText: 'function greet() {}', isCorrect: true, orderIndex: 1 },
        { ID: 'q4o2', optionText: 'const greet = () => {}', isCorrect: true, orderIndex: 2 },
        { ID: 'q4o3', optionText: 'lambda greet() {}', isCorrect: false, orderIndex: 3 },
        { ID: 'q4o4', optionText: 'const greet = function() {}', isCorrect: true, orderIndex: 4 }
      ]
    },
    {
      ID: 'q5', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 5, points: 1,
      questionType: 'mcq_single',
      questionText: 'What does the `===` operator check?',
      explanation: '`===` is the strict equality operator that checks both value and type without type coercion.',
      options: [
        { ID: 'q5o1', optionText: 'Value only', isCorrect: false, orderIndex: 1 },
        { ID: 'q5o2', optionText: 'Type only', isCorrect: false, orderIndex: 2 },
        { ID: 'q5o3', optionText: 'Value and type', isCorrect: true, orderIndex: 3 },
        { ID: 'q5o4', optionText: 'Reference equality', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q6', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 6, points: 1,
      questionType: 'fill_blank',
      questionText: 'The method used to convert a JSON string to a JavaScript object is JSON._____()',
      explanation: 'JSON.parse() converts a JSON string into a JavaScript object. JSON.stringify() does the reverse.',
      options: [
        { ID: 'q6o1', optionText: 'parse', isCorrect: true, orderIndex: 1 }
      ]
    },
    {
      ID: 'q7', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 7, points: 1,
      questionType: 'mcq_single',
      questionText: 'What is a closure in JavaScript?',
      explanation: 'A closure is a function bundled with its lexical environment, allowing it to access variables from its outer scope even after the outer function has returned.',
      options: [
        { ID: 'q7o1', optionText: 'A way to close browser windows', isCorrect: false, orderIndex: 1 },
        { ID: 'q7o2', optionText: 'A function with access to its outer scope variables', isCorrect: true, orderIndex: 2 },
        { ID: 'q7o3', optionText: 'A method to end event loops', isCorrect: false, orderIndex: 3 },
        { ID: 'q7o4', optionText: 'A design pattern for error handling', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q8', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 8, points: 1,
      questionType: 'true_false',
      questionText: '`Promise.all()` rejects if any single promise rejects.',
      explanation: 'Promise.all() is "all or nothing" — if any promise rejects, the entire Promise.all() rejects with that reason.',
      options: [
        { ID: 'q8o1', optionText: 'True', isCorrect: true, orderIndex: 1 },
        { ID: 'q8o2', optionText: 'False', isCorrect: false, orderIndex: 2 }
      ]
    },
    {
      ID: 'q9', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 9, points: 2,
      questionType: 'mcq_multi',
      questionText: 'Which array methods return a new array without modifying the original? (Select all)',
      explanation: 'map(), filter(), and slice() return new arrays. splice() modifies the original array in place.',
      options: [
        { ID: 'q9o1', optionText: 'map()', isCorrect: true, orderIndex: 1 },
        { ID: 'q9o2', optionText: 'filter()', isCorrect: true, orderIndex: 2 },
        { ID: 'q9o3', optionText: 'splice()', isCorrect: false, orderIndex: 3 },
        { ID: 'q9o4', optionText: 'slice()', isCorrect: true, orderIndex: 4 }
      ]
    },
    {
      ID: 'q10', quizVersion_ID: qv1Id, tenantId: 't1', orderIndex: 10, points: 1,
      questionType: 'mcq_single',
      questionText: 'What is the event loop in JavaScript?',
      explanation: 'The event loop continuously checks if the call stack is empty and pushes callbacks from the task queue to the stack, enabling asynchronous behavior in single-threaded JS.',
      options: [
        { ID: 'q10o1', optionText: 'A loop that handles DOM events only', isCorrect: false, orderIndex: 1 },
        { ID: 'q10o2', optionText: 'A mechanism that handles async callbacks in single-threaded JS', isCorrect: true, orderIndex: 2 },
        { ID: 'q10o3', optionText: 'A for-loop variant', isCorrect: false, orderIndex: 3 },
        { ID: 'q10o4', optionText: 'A browser-only feature not in Node.js', isCorrect: false, orderIndex: 4 }
      ]
    }
  ];

  // ========== QUIZ 2: Web Security Basics ==========
  const quiz2Id = 'quiz-sec-201';
  const qv2Id = 'qv-sec-201-v1';

  await INSERT.into(Quizzes).entries({
    ID: quiz2Id,
    tenantId: 't1',
    title: 'Web Security Essentials',
    description: 'Assess your understanding of OWASP Top 10, authentication, encryption, and secure coding practices.',
    category: 'Security',
    difficulty: 'hard',
    timeLimitMinutes: 45,
    passingScorePct: 75,
    attemptsAllowed: 2,
    scoringRule: 'best',
    negativeMarking: true,
    negativeMarkPct: 25,
    randomizeQuestions: true,
    randomizeOptions: true,
    showResultMode: 'immediate',
    showExplanations: true,
    status: 'published',
    currentVersion: 1,
    shareCode: 'SEC201Y',
    createdBy_ID: 'u2'
  });

  await INSERT.into(QuizVersions).entries({
    ID: qv2Id,
    quiz_ID: quiz2Id,
    versionNumber: 1,
    isActive: true
  });

  const secQuestions = [
    {
      ID: 'q11', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 1, points: 1,
      questionType: 'mcq_single',
      questionText: 'What does XSS stand for?',
      explanation: 'XSS stands for Cross-Site Scripting, a vulnerability where attackers inject malicious scripts into web pages.',
      options: [
        { ID: 'q11o1', optionText: 'Cross-Site Scripting', isCorrect: true, orderIndex: 1 },
        { ID: 'q11o2', optionText: 'Cross-Server Scripting', isCorrect: false, orderIndex: 2 },
        { ID: 'q11o3', optionText: 'Cross-Site Security', isCorrect: false, orderIndex: 3 },
        { ID: 'q11o4', optionText: 'Client-Side Scripting', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q12', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 2, points: 1,
      questionType: 'mcq_single',
      questionText: 'Which HTTP header helps prevent XSS attacks?',
      explanation: 'Content-Security-Policy restricts the sources from which scripts can be loaded, mitigating XSS.',
      options: [
        { ID: 'q12o1', optionText: 'X-Frame-Options', isCorrect: false, orderIndex: 1 },
        { ID: 'q12o2', optionText: 'Content-Security-Policy', isCorrect: true, orderIndex: 2 },
        { ID: 'q12o3', optionText: 'Cache-Control', isCorrect: false, orderIndex: 3 },
        { ID: 'q12o4', optionText: 'Accept-Encoding', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q13', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 3, points: 1,
      questionType: 'true_false',
      questionText: 'SQL injection can be fully prevented by using parameterized queries.',
      explanation: 'Parameterized queries (prepared statements) are the primary defense against SQL injection as they separate SQL code from data.',
      options: [
        { ID: 'q13o1', optionText: 'True', isCorrect: true, orderIndex: 1 },
        { ID: 'q13o2', optionText: 'False', isCorrect: false, orderIndex: 2 }
      ]
    },
    {
      ID: 'q14', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 4, points: 2,
      questionType: 'mcq_multi',
      questionText: 'Which are part of the OWASP Top 10 (2021)? (Select all that apply)',
      explanation: 'Broken Access Control (#1), Cryptographic Failures (#2), and Injection (#3) are all in OWASP Top 10. "Buffer Overflow" is a CWE but not a standalone OWASP Top 10 category.',
      options: [
        { ID: 'q14o1', optionText: 'Broken Access Control', isCorrect: true, orderIndex: 1 },
        { ID: 'q14o2', optionText: 'Cryptographic Failures', isCorrect: true, orderIndex: 2 },
        { ID: 'q14o3', optionText: 'Buffer Overflow', isCorrect: false, orderIndex: 3 },
        { ID: 'q14o4', optionText: 'Injection', isCorrect: true, orderIndex: 4 }
      ]
    },
    {
      ID: 'q15', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 5, points: 1,
      questionType: 'mcq_single',
      questionText: 'What is CSRF?',
      explanation: 'Cross-Site Request Forgery tricks a user\'s browser into making unintended requests to a site where they are authenticated.',
      options: [
        { ID: 'q15o1', optionText: 'Cross-Site Request Forgery', isCorrect: true, orderIndex: 1 },
        { ID: 'q15o2', optionText: 'Client-Side Request Failure', isCorrect: false, orderIndex: 2 },
        { ID: 'q15o3', optionText: 'Cross-Server Resource Fetching', isCorrect: false, orderIndex: 3 },
        { ID: 'q15o4', optionText: 'Certificate Signing Request Format', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q16', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 6, points: 1,
      questionType: 'fill_blank',
      questionText: 'The process of converting plaintext to ciphertext is called _____.',
      explanation: 'Encryption is the process of encoding information so that only authorized parties can access it.',
      options: [
        { ID: 'q16o1', optionText: 'encryption', isCorrect: true, orderIndex: 1 }
      ]
    },
    {
      ID: 'q17', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 7, points: 1,
      questionType: 'mcq_single',
      questionText: 'Which hashing algorithm is recommended for storing passwords?',
      explanation: 'bcrypt is specifically designed for password hashing with built-in salting and configurable work factor. MD5 and SHA-1 are too fast and insecure for passwords.',
      options: [
        { ID: 'q17o1', optionText: 'MD5', isCorrect: false, orderIndex: 1 },
        { ID: 'q17o2', optionText: 'SHA-1', isCorrect: false, orderIndex: 2 },
        { ID: 'q17o3', optionText: 'bcrypt', isCorrect: true, orderIndex: 3 },
        { ID: 'q17o4', optionText: 'Base64', isCorrect: false, orderIndex: 4 }
      ]
    },
    {
      ID: 'q18', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 8, points: 1,
      questionType: 'true_false',
      questionText: 'HTTPS encrypts data in transit between client and server.',
      explanation: 'HTTPS uses TLS/SSL to encrypt communication, protecting data from eavesdropping and tampering.',
      options: [
        { ID: 'q18o1', optionText: 'True', isCorrect: true, orderIndex: 1 },
        { ID: 'q18o2', optionText: 'False', isCorrect: false, orderIndex: 2 }
      ]
    },
    {
      ID: 'q19', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 9, points: 2,
      questionType: 'mcq_multi',
      questionText: 'Which practices help secure a REST API? (Select all)',
      explanation: 'Input validation, rate limiting, and HTTPS all contribute to API security. Storing passwords in query strings exposes them in logs and browser history.',
      options: [
        { ID: 'q19o1', optionText: 'Input validation', isCorrect: true, orderIndex: 1 },
        { ID: 'q19o2', optionText: 'Rate limiting', isCorrect: true, orderIndex: 2 },
        { ID: 'q19o3', optionText: 'Storing passwords in query strings', isCorrect: false, orderIndex: 3 },
        { ID: 'q19o4', optionText: 'Using HTTPS', isCorrect: true, orderIndex: 4 }
      ]
    },
    {
      ID: 'q20', quizVersion_ID: qv2Id, tenantId: 't1', orderIndex: 10, points: 1,
      questionType: 'mcq_single',
      questionText: 'What is the principle of least privilege?',
      explanation: 'The principle of least privilege means giving users only the minimum permissions they need to perform their tasks, reducing the attack surface.',
      options: [
        { ID: 'q20o1', optionText: 'Users should have all permissions by default', isCorrect: false, orderIndex: 1 },
        { ID: 'q20o2', optionText: 'Users should have only the minimum permissions needed', isCorrect: true, orderIndex: 2 },
        { ID: 'q20o3', optionText: 'Admins should not have root access', isCorrect: false, orderIndex: 3 },
        { ID: 'q20o4', optionText: 'All APIs should be public', isCorrect: false, orderIndex: 4 }
      ]
    }
  ];

  // Insert all questions and options
  for (const q of [...jsQuestions, ...secQuestions]) {
    const { options, ...questionData } = q;
    await INSERT.into(Questions).entries(questionData);
    for (const opt of options) {
      await INSERT.into(QuestionOptions).entries({ ...opt, question_ID: q.ID });
    }
  }

  console.log('✅ Seed data loaded: 2 quizzes, 20 questions, 5 users');
}

module.exports = seed;

// Run directly
if (require.main === module) {
  seed().catch(console.error).finally(() => process.exit());
}
