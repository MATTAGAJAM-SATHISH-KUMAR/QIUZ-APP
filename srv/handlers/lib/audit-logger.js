// ============================================================================
// Audit Logger — Tracks all security-sensitive operations
// ============================================================================
const { v4: uuidv4 } = require('uuid');

function getAuditLogger(db) {
  const { AuditLogs } = db.entities('quiz.app');

  return {
    /**
     * Log an auditable action.
     * @param {string} action - e.g., 'quiz.created', 'result.changed'
     * @param {string} entityType - e.g., 'Quizzes', 'QuizAttempts'
     * @param {string} entityId - UUID of the affected entity
     * @param {object|null} oldValue - Previous state (for updates)
     * @param {object|null} newValue - New state
     * @param {string} [userId] - Acting user ID
     * @param {string} [tenantId] - Tenant ID
     */
    async log(action, entityType, entityId, oldValue, newValue, userId, tenantId) {
      try {
        await INSERT.into(AuditLogs).entries({
          ID: uuidv4(),
          tenantId: tenantId || 'system',
          userId: userId || null,
          action,
          entityType,
          entityId,
          oldValue: oldValue ? JSON.stringify(oldValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        // Audit logging should never break the main flow
        console.error('[AUDIT] Failed to write audit log:', err.message);
      }
    }
  };
}

module.exports = { getAuditLogger };
