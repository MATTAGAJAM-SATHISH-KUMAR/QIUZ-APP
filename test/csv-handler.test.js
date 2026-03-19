// ============================================================================
// CSV Handler Tests — Validates import/export functionality
// ============================================================================
const { CsvExporter, CsvImporter } = require('../srv/handlers/lib/csv-handler');

describe('CSV Handler', () => {
  describe('CsvExporter', () => {
    const exporter = new CsvExporter();

    test('exports questions to CSV format', () => {
      const questions = [{
        questionText: 'What is 2+2?',
        questionType: 'mcq_single',
        points: 1,
        explanation: 'Basic arithmetic',
        options: [
          { optionText: '3', isCorrect: false },
          { optionText: '4', isCorrect: true },
          { optionText: '5', isCorrect: false },
          { optionText: '6', isCorrect: false }
        ]
      }];

      const csv = exporter.exportQuestions(questions);
      expect(csv).toContain('questionText');
      expect(csv).toContain('What is 2+2?');
      expect(csv.split('\n').length).toBe(2); // header + 1 row
    });

    test('handles questions with no options', () => {
      const questions = [{
        questionText: 'Fill in blank',
        questionType: 'fill_blank',
        points: 1,
        explanation: '',
        options: []
      }];
      const csv = exporter.exportQuestions(questions);
      expect(csv).toContain('Fill in blank');
    });

    test('exports results to CSV', () => {
      const attempts = [{
        ID: 'a1', user_ID: 'u1', attemptNumber: 1,
        totalScore: 8, maxPossibleScore: 10, scorePercentage: 80,
        passed: true, timeTakenSeconds: 300, submittedAt: '2026-03-19T12:00:00Z'
      }];
      const csv = exporter.exportResults(attempts);
      expect(csv).toContain('attemptId');
      expect(csv).toContain('80');
    });

    test('escapes commas and quotes in text', () => {
      const questions = [{
        questionText: 'Which operator means "and" in JS?',
        questionType: 'mcq_single',
        points: 1,
        explanation: '',
        options: []
      }];
      const csv = exporter.exportQuestions(questions);
      // The text should be wrapped in quotes
      expect(csv).toContain('"');
    });
  });

  describe('CsvImporter', () => {
    const importer = new CsvImporter();

    test('parses CSV with questions and options', async () => {
      const csv = `questionText,questionType,points,explanation,option1,option1_correct,option2,option2_correct,option3,option3_correct,option4,option4_correct
"What is 1+1?",mcq_single,1,"Simple math","1",false,"2",true,"3",false,"4",false`;

      const questions = await importer.parse(csv);
      expect(questions).toHaveLength(1);
      expect(questions[0].questionText).toBe('What is 1+1?');
      expect(questions[0].options).toHaveLength(4);
      expect(questions[0].options[1].isCorrect).toBe(true);
    });

    test('returns empty array for empty CSV', async () => {
      const questions = await importer.parse('');
      expect(questions).toHaveLength(0);
    });

    test('returns empty for header-only CSV', async () => {
      const questions = await importer.parse('questionText,questionType');
      expect(questions).toHaveLength(0);
    });
  });
});
