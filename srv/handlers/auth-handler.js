// ============================================================================
// Auth Service Handler — Login, Register, JWT token management
// ============================================================================
const cds = require('@sap/cds');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getAuditLogger } = require('./lib/audit-logger');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

class AuthServiceHandler extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to('db');
    const { Users, Tenants, RefreshTokens } = db.entities('quiz.app');
    const audit = getAuditLogger(db);

    // ---- REGISTER ----
    this.on('register', async (req) => {
      const { email, password, firstName, lastName, tenantSlug, role } = req.data;

      // Validation
      if (!email || !password) {
        return req.reject(400, 'Email and password are required');
      }
      if (password.length < 8) {
        return req.reject(400, 'Password must be at least 8 characters');
      }
      if (!isValidEmail(email)) {
        return req.reject(400, 'Invalid email format');
      }

      // Find tenant
      const tenant = await SELECT.one.from(Tenants)
        .where({ slug: tenantSlug || 'acme-university', isActive: true });
      if (!tenant) {
        return req.reject(404, 'Organization not found');
      }

      // Check for existing user
      const existing = await SELECT.one.from(Users)
        .where({ email: email.toLowerCase(), tenant_ID: tenant.ID });
      if (existing) {
        return req.reject(409, 'User with this email already exists');
      }

      // Only Admin can create Admin/Instructor accounts
      const assignedRole = (role === 'Admin' || role === 'Instructor') ? 'Student' : (role || 'Student');

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      await INSERT.into(Users).entries({
        ID: userId,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: assignedRole,
        isActive: true,
        tenant_ID: tenant.ID
      });

      const tokens = generateTokens(userId, email.toLowerCase(), assignedRole, tenant.ID);
      await storeRefreshToken(db, RefreshTokens, userId, tokens.refreshToken);

      await audit.log('user.registered', 'Users', userId, null, { email, role: assignedRole });

      return {
        success: true,
        message: 'Registration successful',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: userId,
          email: email.toLowerCase(),
          firstName,
          lastName,
          role: assignedRole,
          tenantId: tenant.ID,
          tenantName: tenant.name
        }
      };
    });

    // ---- LOGIN ----
    this.on('login', async (req) => {
      const { email, password } = req.data;

      if (!email || !password) {
        return req.reject(400, 'Email and password are required');
      }

      const user = await SELECT.one.from(Users)
        .where({ email: email.toLowerCase(), isActive: true });

      if (!user) {
        return req.reject(401, 'Invalid email or password');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return req.reject(401, 'Invalid email or password');
      }

      const tenant = await SELECT.one.from(Tenants).where({ ID: user.tenant_ID });

      const tokens = generateTokens(user.ID, user.email, user.role, user.tenant_ID);
      await storeRefreshToken(db, RefreshTokens, user.ID, tokens.refreshToken);

      // Update last login
      await UPDATE(Users).where({ ID: user.ID }).set({ lastLoginAt: new Date().toISOString() });

      await audit.log('user.login', 'Users', user.ID, null, { email: user.email });

      return {
        success: true,
        message: 'Login successful',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.ID,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenant_ID,
          tenantName: tenant?.name
        }
      };
    });

    // ---- REFRESH TOKEN ----
    this.on('refreshToken', async (req) => {
      const { refreshToken } = req.data;
      if (!refreshToken) {
        return req.reject(400, 'Refresh token is required');
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_SECRET);
      } catch {
        return req.reject(401, 'Invalid or expired refresh token');
      }

      const storedToken = await SELECT.one.from(RefreshTokens)
        .where({ token: refreshToken, isRevoked: false });
      if (!storedToken) {
        return req.reject(401, 'Refresh token revoked or not found');
      }

      // Revoke old token
      await UPDATE(RefreshTokens).where({ ID: storedToken.ID }).set({ isRevoked: true });

      const user = await SELECT.one.from(Users).where({ ID: decoded.userId, isActive: true });
      if (!user) {
        return req.reject(401, 'User not found');
      }

      const tenant = await SELECT.one.from(Tenants).where({ ID: user.tenant_ID });
      const tokens = generateTokens(user.ID, user.email, user.role, user.tenant_ID);
      await storeRefreshToken(db, RefreshTokens, user.ID, tokens.refreshToken);

      return {
        success: true,
        message: 'Token refreshed',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.ID,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenant_ID,
          tenantName: tenant?.name
        }
      };
    });

    // ---- LOGOUT ----
    this.on('logout', async (req) => {
      const { refreshToken } = req.data;
      if (refreshToken) {
        await UPDATE(RefreshTokens)
          .where({ token: refreshToken })
          .set({ isRevoked: true });
      }
      return { success: true };
    });

    // ---- ME (current user profile) ----
    this.on('me', async (req) => {
      const userId = req.user?.id;
      if (!userId) return req.reject(401, 'Not authenticated');

      const user = await SELECT.one.from(Users).where({ ID: userId });
      if (!user) return req.reject(404, 'User not found');

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

    // ---- FORGOT PASSWORD (stub — would send email in production) ----
    this.on('forgotPassword', async (req) => {
      // In production: generate reset token, send email
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    });

    // ---- RESET PASSWORD ----
    this.on('resetPassword', async (req) => {
      // In production: verify reset token, update password
      return { success: true };
    });

    await super.init();
  }
}

// --- Helper Functions ---

function generateTokens(userId, email, role, tenantId) {
  const accessToken = jwt.sign(
    { userId, email, role, tenantId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

async function storeRefreshToken(db, RefreshTokens, userId, token) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await INSERT.into(RefreshTokens).entries({
    ID: uuidv4(),
    user_ID: userId,
    token,
    expiresAt: expiresAt.toISOString(),
    isRevoked: false
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { AuthServiceHandler };
