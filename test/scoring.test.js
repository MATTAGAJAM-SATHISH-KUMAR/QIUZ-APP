// ============================================================================
// Scoring Engine Tests — Validates all question types, negative marking, partial credit
// ============================================================================
const { ScoringEngine } = require('../srv/handlers/lib/scoring-engine');

describe('ScoringEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ScoringEngine();
  });

  // --- MCQ Single Answer ---
  describe('MCQ Single Answer', () => {
    const question = { questionType: 'mcq_single', points: 2 };
    const options = [
      { ID: 'a', isCorrect: false },
      { ID: 'b', isCorrect: true },
      { ID: 'c', isCorrect: false },
      { ID: 'd', isCorrect: false }
    ];

    test('correct answer awards full points', () => {
      const answer = { selectedOptions: JSON.stringify(['b']) };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsAwarded).toBe(2);
    });

    test('wrong answer awards 0 points (no negative marking)', () => {
      const answer = { selectedOptions: JSON.stringify(['a']) };
      const result = engine.gradeQuestion(question, options, answer, false);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    test('wrong answer deducts with negative marking', () => {
      const answer = { selectedOptions: JSON.stringify(['c']) };
      const result = engine.gradeQuestion(question, options, answer, true, 25);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsAwarded).toBe(-0.5); // 25% of 2 points
    });

    test('no answer awards 0 points', () => {
      const answer = { selectedOptions: null };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.pointsAwarded).toBe(0);
    });

    test('handles array input for selectedOptions', () => {
      const answer = { selectedOptions: ['b'] };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsAwarded).toBe(2);
    });
  });

  // --- MCQ Multi Select ---
  describe('MCQ Multi Select', () => {
    const question = { questionType: 'mcq_multi', points: 3 };
    const options = [
      { ID: 'a', isCorrect: true },
      { ID: 'b', isCorrect: true },
      { ID: 'c', isCorrect: false },
      { ID: 'd', isCorrect: true }
    ];

    test('all correct selections award full points', () => {
      const answer = { selectedOptions: JSON.stringify(['a', 'b', 'd']) };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsAwarded).toBe(3);
    });

    test('partial selection awards partial credit', () => {
      const answer = { selectedOptions: JSON.stringify(['a', 'b']) };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsAwarded).toBe(2); // 2 of 3 correct
    });

    test('incorrect selection reduces partial credit', () => {
      const answer = { selectedOptions: JSON.stringify(['a', 'c']) };
      const result = engine.gradeQuestion(question, options, answer, true, 25);
      expect(result.isCorrect).toBe(false);
      // 1 correct (1 pt) - 1 wrong (0.25 pt penalty) = 0.75
      expect(result.pointsAwarded).toBe(0.75);
    });

    test('no selection awards 0', () => {
      const answer = { selectedOptions: '[]' };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  // --- True/False ---
  describe('True/False', () => {
    const question = { questionType: 'true_false', points: 1 };
    const options = [
      { ID: 'true', isCorrect: true },
      { ID: 'false', isCorrect: false }
    ];

    test('correct answer awards full points', () => {
      const answer = { selectedOptions: JSON.stringify(['true']) };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsAwarded).toBe(1);
    });

    test('wrong answer', () => {
      const answer = { selectedOptions: JSON.stringify(['false']) };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(false);
    });
  });

  // --- Fill in the Blank ---
  describe('Fill in the Blank', () => {
    const question = { questionType: 'fill_blank', points: 1 };
    const options = [
      { isCorrect: true, optionText: 'parse' }
    ];

    test('exact match (case-insensitive) awards points', () => {
      const answer = { fillBlankAnswer: 'Parse' };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsAwarded).toBe(1);
    });

    test('wrong answer', () => {
      const answer = { fillBlankAnswer: 'stringify' };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(false);
    });

    test('empty answer', () => {
      const answer = { fillBlankAnswer: '' };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.pointsAwarded).toBe(0);
    });

    test('whitespace trimming', () => {
      const answer = { fillBlankAnswer: '  parse  ' };
      const result = engine.gradeQuestion(question, options, answer);
      expect(result.isCorrect).toBe(true);
    });
  });

  // --- Final Score Computation ---
  describe('computeFinalScore', () => {
    const attempts = [
      { status: 'graded', scorePercentage: 60 },
      { status: 'graded', scorePercentage: 80 },
      { status: 'graded', scorePercentage: 70 }
    ];

    test('best scoring rule returns highest', () => {
      expect(engine.computeFinalScore(attempts, 'best')).toBe(80);
    });

    test('latest scoring rule returns last', () => {
      expect(engine.computeFinalScore(attempts, 'latest')).toBe(70);
    });

    test('average scoring rule returns mean', () => {
      expect(engine.computeFinalScore(attempts, 'average')).toBe(70);
    });

    test('empty attempts returns 0', () => {
      expect(engine.computeFinalScore([], 'best')).toBe(0);
    });

    test('ignores non-graded attempts', () => {
      const mixed = [
        { status: 'in_progress', scorePercentage: 100 },
        { status: 'graded', scorePercentage: 50 }
      ];
      expect(engine.computeFinalScore(mixed, 'best')).toBe(50);
    });
  });

  // --- Unknown question type ---
  test('unknown question type returns 0', () => {
    const result = engine.gradeQuestion({ questionType: 'essay', points: 5 }, [], {});
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });
});
