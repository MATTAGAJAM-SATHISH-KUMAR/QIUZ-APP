// ============================================================================
// User Service Handler — Profile management (auth via XSUAA)
// Standard CAP handler pattern: module.exports = cds.service.impl(...)
// ============================================================================
const cds = require('@sap/cds');
const { getAuditLogger } = require('./handlers/lib/audit-logger');

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to('db');
  const { Users, Tenants } = db.entities('quiz.app');
  const audit = getAuditLogger(db);

  // ---- ME (current user profile) ----
  this.on('me', async (req) => {
    const userId = req.user?.id || 'anonymous';
    const email = req.user?.attr?.email || req.user?.id || 'admin@quiz.app';

    // Find or auto-provision user profile from XSUAA claims
    let user = await SELECT.one.from(Users).where({ ID: userId });

    if (!user) {
      // Auto-provision on first login from XSUAA token attributes
      const roles = req.user?.roles || {};
      const role = roles.Admin ? 'Admin' : roles.Instructor ? 'Instructor' : 'Admin';
      const tenantId = req.user?.tenant;

      // Find tenant or use default
      let tenant = tenantId
        ? await SELECT.one.from(Tenants).where({ ID: tenantId })
        : await SELECT.one.from(Tenants).where({ isActive: true });

      const { v4: uuidv4 } = require('uuid');
      const newId = userId || uuidv4();

      await INSERT.into(Users).entries({
        ID: newId,
        email,
        firstName: req.user.attr?.given_name || '',
        lastName: req.user.attr?.family_name || '',
        role,
        isActive: true,
        tenant_ID: tenant?.ID,
        lastLoginAt: new Date().toISOString()
      });

      user = await SELECT.one.from(Users).where({ ID: newId });
      tenant = tenant || {};

      await audit.log('user.auto-provisioned', 'Users', newId, null, { email, role });

      return {
        id: newId,
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        tenantId: tenant.ID,
        tenantName: tenant.name
      };
    }

    // Update last login
    await UPDATE(Users).where({ ID: user.ID }).set({ lastLoginAt: new Date().toISOString() });

    const tenant = await SELECT.one.from(Tenants).where({ ID: user.tenant_ID });

    return {
      id: user.ID,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenant_ID,
      tenantName: tenant?.name
    };
  });

  // ---- UPDATE PROFILE ----
  this.on('updateProfile', async (req) => {
    const userId = req.user.id;
    const { firstName, lastName, avatarUrl } = req.data;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    await UPDATE(Users).where({ ID: userId }).set(updates);

    const user = await SELECT.one.from(Users).where({ ID: userId });
    const tenant = await SELECT.one.from(Tenants).where({ ID: user.tenant_ID });

    await audit.log('user.profile.updated', 'Users', userId, null, updates);

    return {
      id: user.ID,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenant_ID,
      tenantName: tenant?.name
    };
  });
});
