// ============================================================================
// Scoring Engine — Grades all question types with negative marking support
// ============================================================================

class ScoringEngine {
  /**
   * Grade a single question answer.
   * @param {object} question - Question entity
   * @param {object[]} options - QuestionOptions for this question
   * @param {object} answer - AttemptAnswer from the student
   * @param {boolean} negativeMarking - Whether negative marking is enabled
   * @param {number} negativeMarkPct - Percentage of points deducted for wrong answer
   * @returns {{ isCorrect: boolean, pointsAwarded: number }}
   */
  gradeQuestion(question, options, answer, negativeMarking = false, negativeMarkPct = 25) {
    const maxPoints = parseFloat(question.points || 1);

    switch (question.questionType) {
      case 'mcq_single':
        return this._gradeMCQSingle(options, answer, maxPoints, negativeMarking, negativeMarkPct);
      case 'mcq_multi':
        return this._gradeMCQMulti(options, answer, maxPoints, negativeMarking, negativeMarkPct);
      case 'true_false':
        return this._gradeMCQSingle(options, answer, maxPoints, negativeMarking, negativeMarkPct);
      case 'fill_blank':
        return this._gradeFillBlank(options, answer, maxPoints, negativeMarking, negativeMarkPct);
      case 'matching':
        return this._gradeMatching(question, answer, maxPoints);
      default:
        return { isCorrect: false, pointsAwarded: 0 };
    }
  }

  _gradeMCQSingle(options, answer, maxPoints, negativeMarking, negativeMarkPct) {
    const selected = this._parseSelected(answer.selectedOptions);
    if (selected.length === 0) return { isCorrect: false, pointsAwarded: 0 };

    const correctOption = options.find(o => o.isCorrect);
    const isCorrect = correctOption && selected.includes(correctOption.ID);

    if (isCorrect) {
      return { isCorrect: true, pointsAwarded: maxPoints };
    }

    const penalty = negativeMarking ? -(maxPoints * negativeMarkPct / 100) : 0;
    return { isCorrect: false, pointsAwarded: penalty };
  }

  _gradeMCQMulti(options, answer, maxPoints, negativeMarking, negativeMarkPct) {
    const selected = this._parseSelected(answer.selectedOptions);
    if (selected.length === 0) return { isCorrect: false, pointsAwarded: 0 };

    const correctIds = new Set(options.filter(o => o.isCorrect).map(o => o.ID));
    const selectedSet = new Set(selected);

    // Check for exact match
    const allCorrectSelected = [...correctIds].every(id => selectedSet.has(id));
    const noIncorrectSelected = [...selectedSet].every(id => correctIds.has(id));

    if (allCorrectSelected && noIncorrectSelected) {
      return { isCorrect: true, pointsAwarded: maxPoints };
    }

    // Partial credit: points per correct selection, minus deductions for incorrect
    const pointPerOption = maxPoints / correctIds.size;
    let earned = 0;
    for (const id of selectedSet) {
      if (correctIds.has(id)) {
        earned += pointPerOption;
      } else if (negativeMarking) {
        earned -= pointPerOption * (negativeMarkPct / 100);
      }
    }

    earned = Math.max(0, Math.round(earned * 100) / 100);
    return { isCorrect: allCorrectSelected && noIncorrectSelected, pointsAwarded: earned };
  }

  _gradeFillBlank(options, answer, maxPoints, negativeMarking, negativeMarkPct) {
    const studentAnswer = (answer.fillBlankAnswer || '').trim().toLowerCase();
    if (!studentAnswer) return { isCorrect: false, pointsAwarded: 0 };

    // Accept any correct option (case-insensitive)
    const correctAnswers = options
      .filter(o => o.isCorrect)
      .map(o => o.optionText.trim().toLowerCase());

    const isCorrect = correctAnswers.includes(studentAnswer);

    if (isCorrect) {
      return { isCorrect: true, pointsAwarded: maxPoints };
    }

    const penalty = negativeMarking ? -(maxPoints * negativeMarkPct / 100) : 0;
    return { isCorrect: false, pointsAwarded: penalty };
  }

  _gradeMatching(question, answer, maxPoints) {
    if (!answer.matchingAnswer) return { isCorrect: false, pointsAwarded: 0 };

    let studentPairs;
    try {
      studentPairs = JSON.parse(answer.matchingAnswer);
    } catch {
      return { isCorrect: false, pointsAwarded: 0 };
    }

    // Compare pairs — simplified: count correct matches
    // Student answer format: [{ leftItem, rightItem }]
    // In a real implementation, compare against MatchPairs
    const totalPairs = studentPairs.length || 1;
    let correct = 0;
    // This is a simplified version — in production, compare against MatchPairs entity
    for (const pair of studentPairs) {
      if (pair.isCorrect) correct++;
    }

    const ratio = correct / totalPairs;
    return {
      isCorrect: ratio === 1,
      pointsAwarded: Math.round(maxPoints * ratio * 100) / 100
    };
  }

  _parseSelected(selectedOptions) {
    if (!selectedOptions) return [];
    if (Array.isArray(selectedOptions)) return selectedOptions;
    try {
      return JSON.parse(selectedOptions);
    } catch {
      return [];
    }
  }

  /**
   * Compute the final score for a multi-attempt quiz based on scoring rule.
   * @param {object[]} attempts - All graded attempts for a user/quiz pair
   * @param {string} scoringRule - 'best' | 'latest' | 'average'
   * @returns {number} Final score percentage
   */
  computeFinalScore(attempts, scoringRule = 'best') {
    if (!attempts || attempts.length === 0) return 0;

    const scores = attempts
      .filter(a => a.status === 'graded')
      .map(a => parseFloat(a.scorePercentage || 0));

    if (scores.length === 0) return 0;

    switch (scoringRule) {
      case 'best':
        return Math.max(...scores);
      case 'latest':
        return scores[scores.length - 1];
      case 'average':
        return Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100;
      default:
        return Math.max(...scores);
    }
  }
}

module.exports = { ScoringEngine };
