// ============================================================================
// CSV Handler — Import/Export questions and results in CSV format
// ============================================================================

class CsvExporter {
  /**
   * Export questions to CSV string.
   */
  exportQuestions(questions) {
    const headers = ['questionText', 'questionType', 'points', 'explanation', 'option1', 'option1_correct', 'option2', 'option2_correct', 'option3', 'option3_correct', 'option4', 'option4_correct'];
    const rows = [headers.join(',')];

    for (const q of questions) {
      const opts = q.options || [];
      const row = [
        this._escape(q.questionText),
        q.questionType,
        q.points,
        this._escape(q.explanation || ''),
        this._escape(opts[0]?.optionText || ''), opts[0]?.isCorrect || false,
        this._escape(opts[1]?.optionText || ''), opts[1]?.isCorrect || false,
        this._escape(opts[2]?.optionText || ''), opts[2]?.isCorrect || false,
        this._escape(opts[3]?.optionText || ''), opts[3]?.isCorrect || false
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Export results to CSV string.
   */
  exportResults(attempts, format = 'csv') {
    const headers = ['attemptId', 'userId', 'attemptNumber', 'totalScore', 'maxScore', 'percentage', 'passed', 'timeTaken', 'submittedAt'];
    const rows = [headers.join(',')];

    for (const a of attempts) {
      rows.push([
        a.ID, a.user_ID, a.attemptNumber,
        a.totalScore, a.maxPossibleScore, a.scorePercentage,
        a.passed, a.timeTakenSeconds, a.submittedAt
      ].join(','));
    }

    return rows.join('\n');
  }

  _escape(str) {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""').replace(/\n/g, ' ');
    return `"${escaped}"`;
  }
}

class CsvImporter {
  /**
   * Parse CSV data into question objects.
   */
  async parse(csvData) {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseLine(lines[i]);
      const q = {};
      headers.forEach((h, idx) => { q[h] = values[idx]; });

      const options = [];
      for (let n = 1; n <= 4; n++) {
        const text = q[`option${n}`];
        if (text) {
          options.push({
            optionText: text.replace(/^"|"$/g, ''),
            isCorrect: q[`option${n}_correct`] === 'true'
          });
        }
      }

      questions.push({
        questionText: (q.questionText || '').replace(/^"|"$/g, ''),
        questionType: q.questionType || 'mcq_single',
        points: parseFloat(q.points) || 1,
        explanation: (q.explanation || '').replace(/^"|"$/g, ''),
        options
      });
    }

    return questions;
  }

  _parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}

module.exports = { CsvExporter, CsvImporter };
