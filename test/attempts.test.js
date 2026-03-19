// ============================================================================
// Attempts Policy Tests — Validates multi-attempt logic, scoring rules, timing
// ============================================================================

describe('Quiz Attempts Policy', () => {
  // --- Attempt counting ---
  describe('Attempt counting and limits', () => {
    function validateAttemptStart(attempts, quiz) {
      const userAttempts = attempts.filter(a => a.status !== 'expired');
      const inProgress = userAttempts.find(a => a.status === 'in_progress');

      if (inProgress && quiz.allowResume) {
        return { allowed: true, action: 'resume', attemptId: inProgress.ID };
      }

      if (quiz.attemptsAllowed > 0 && userAttempts.length >= quiz.attemptsAllowed) {
        return { allowed: false, reason: 'max_attempts_reached' };
      }

      return { allowed: true, action: 'new', attemptNumber: userAttempts.length + 1 };
    }

    test('first attempt is always allowed', () => {
      const result = validateAttemptStart([], { attemptsAllowed: 1, allowResume: true });
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('new');
      expect(result.attemptNumber).toBe(1);
    });

    test('resumes in-progress attempt if allowed', () => {
      const attempts = [{ ID: 'a1', status: 'in_progress' }];
      const result = validateAttemptStart(attempts, { attemptsAllowed: 1, allowResume: true });
      expect(result.action).toBe('resume');
      expect(result.attemptId).toBe('a1');
    });

    test('blocks when max attempts reached', () => {
      const attempts = [
        { ID: 'a1', status: 'graded' },
        { ID: 'a2', status: 'graded' },
        { ID: 'a3', status: 'graded' }
      ];
      const result = validateAttemptStart(attempts, { attemptsAllowed: 3, allowResume: true });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('max_attempts_reached');
    });

    test('unlimited attempts always allowed', () => {
      const attempts = Array.from({ length: 50 }, (_, i) => ({ ID: `a${i}`, status: 'graded' }));
      const result = validateAttemptStart(attempts, { attemptsAllowed: 0, allowResume: true });
      expect(result.allowed).toBe(true);
    });

    test('expired attempts do not count', () => {
      const attempts = [
        { ID: 'a1', status: 'expired' },
        { ID: 'a2', status: 'graded' }
      ];
      const result = validateAttemptStart(attempts, { attemptsAllowed: 2, allowResume: true });
      expect(result.allowed).toBe(true);
      expect(result.attemptNumber).toBe(2);
    });
  });

  // --- Time limit enforcement ---
  describe('Time limit enforcement', () => {
    function isTimeExpired(startedAt, timeLimitMinutes) {
      if (!timeLimitMinutes) return false;
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      return elapsed > timeLimitMinutes * 60;
    }

    test('no time limit never expires', () => {
      expect(isTimeExpired('2020-01-01T00:00:00Z', null)).toBe(false);
      expect(isTimeExpired('2020-01-01T00:00:00Z', 0)).toBe(false);
    });

    test('started 1 hour ago with 30 min limit is expired', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(isTimeExpired(oneHourAgo, 30)).toBe(true);
    });

    test('started 5 minutes ago with 30 min limit is not expired', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(isTimeExpired(fiveMinAgo, 30)).toBe(false);
    });
  });

  // --- Auto-save and answer preservation ---
  describe('Answer auto-save', () => {
    function mergeAnswer(savedAnswers, questionId, newAnswer) {
      return { ...savedAnswers, [questionId]: newAnswer };
    }

    test('saves first answer', () => {
      const result = mergeAnswer({}, 'q1', ['optA']);
      expect(result.q1).toEqual(['optA']);
    });

    test('overwrites previous answer', () => {
      const result = mergeAnswer({ q1: ['optA'] }, 'q1', ['optB']);
      expect(result.q1).toEqual(['optB']);
    });

    test('preserves other answers', () => {
      const result = mergeAnswer({ q1: ['optA'], q2: ['optC'] }, 'q1', ['optB']);
      expect(result.q2).toEqual(['optC']);
    });
  });

  // --- Score calculation edge cases ---
  describe('Score edge cases', () => {
    test('score cannot go below 0', () => {
      const totalScore = -5;
      const floored = Math.max(0, totalScore);
      expect(floored).toBe(0);
    });

    test('percentage with 0 max possible', () => {
      const maxPossible = 0;
      const pct = maxPossible > 0 ? (5 / maxPossible) * 100 : 0;
      expect(pct).toBe(0);
    });

    test('rounding precision', () => {
      const raw = 73.333333;
      const rounded = Math.round(raw * 100) / 100;
      expect(rounded).toBe(73.33);
    });

    test('passing threshold comparison', () => {
      const scorePercentage = 70;
      const passingScore = 70;
      expect(scorePercentage >= passingScore).toBe(true);

      const nearMiss = 69.99;
      expect(nearMiss >= passingScore).toBe(false);
    });
  });
});
