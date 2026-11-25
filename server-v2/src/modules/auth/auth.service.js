const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { withTransaction } = require('../../shared/withTransaction');
const { hashPassword, verifyPassword } = require('../../shared/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../../shared/tokens');
const { toUserView } = require('../../shared/userView');
const { writeAudit } = require('../../shared/audit');
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} = require('../../core/AppError');
const { ROLES } = require('../../shared/roles');
const repo = require('./auth.repository');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Same message for "no such email" and "wrong password", so nobody can test which emails exist.
const invalidLogin = () => new UnauthorizedError('Invalid email or password');
const invalidRefresh = () => new UnauthorizedError('Invalid or expired refresh token');

// When the email does not exist we still run bcrypt once, so the answer takes the same time.
let dummyHash;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password'));

const toDate = (jwtSeconds) => new Date(jwtSeconds * 1000);

/** Create the two tokens and save the refresh token's hash as a new session. */
async function issueSession(client, user, deviceInfo) {
  const identity = { userId: user.user_id, role: user.role, email: user.email };
  const accessToken = signAccessToken(identity);
  const refreshToken = signRefreshToken(identity);
  const refreshExp = toDate(jwt.decode(refreshToken).exp);

  await repo.createSession(client, {
    userId: user.user_id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExp,
    deviceInfo: deviceInfo ? String(deviceInfo).slice(0, 200) : null,
  });

  return {
    user: toUserView(user),
    accessToken,
    refreshToken,
    accessTokenExpiresAt: toDate(jwt.decode(accessToken).exp),
    refreshTokenExpiresAt: refreshExp,
  };
}

/**
 * Self-registration. The account is created switched off with the lowest role, so a stranger
 * gets no access until an admin switches it on (and sets the right role).
 */
async function register(actor, { email, name, password }) {
  const passwordHash = await hashPassword(password);
  try {
    return await withTransaction(async (client) => {
      const user = await repo.insertUser(client, {
        email,
        name,
        role: ROLES.OPERATOR,
        passwordHash,
        isActive: false,
      });
      await writeAudit(client, actor, {
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: user.user_id,
        details: { email },
      });
      return toUserView(user);
    });
  } catch (err) {
    if (err.code === '23505') throw new ConflictError('A user with this email already exists');
    throw err;
  }
}

async function login({ email, password, deviceInfo }) {
  const user = await repo.findUserByEmail(db, email);
  if (!user) {
    await verifyPassword(password, await getDummyHash());
    throw invalidLogin();
  }

  if (user.locked_until && user.locked_until > new Date()) {
    const minutes = Math.ceil((user.locked_until - new Date()) / 60000);
    throw new ForbiddenError(
      `Account locked after too many wrong passwords. Try again in ${minutes} minute(s).`,
    );
  }

  if (!(await verifyPassword(password, user.password_hash))) {
    await repo.recordFailedLogin(db, user.user_id, {
      maxAttempts: MAX_FAILED_ATTEMPTS,
      lockMinutes: LOCK_MINUTES,
    });
    throw invalidLogin();
  }

  // Said only after the password is right, so it does not reveal accounts to strangers.
  if (!user.is_active) throw new ForbiddenError('This account is not active. Contact an admin.');

  return withTransaction(async (client) => {
    await repo.recordSuccessfulLogin(client, user.user_id);
    return issueSession(client, user, deviceInfo);
  });
}

/**
 * Each refresh token works once. Using it swaps it for a new pair.
 * If an already-used token shows up again, someone may have copied it, so every
 * login of that user is ended.
 */
async function refresh({ refreshToken, deviceInfo }) {
  if (!refreshToken) throw invalidRefresh();
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw invalidRefresh();
  }

  // Answer from inside the transaction, throw outside it: a throw would undo the revoke-all.
  const outcome = await withTransaction(async (client) => {
    const session = await repo.findSessionByHash(client, hashToken(refreshToken));
    if (!session) return { error: 'invalid' };
    if (session.revoked_at) {
      await repo.revokeAllSessions(client, session.user_id);
      return { error: 'reused' };
    }
    if (session.expires_at <= new Date()) return { error: 'invalid' };

    const user = await repo.findUserById(client, session.user_id);
    if (!user || !user.is_active) return { error: 'invalid' };

    await repo.revokeSession(client, session.session_id);
    // The role is read fresh here, so a role change takes effect at the next refresh.
    return { result: await issueSession(client, user, deviceInfo) };
  });

  if (outcome.error === 'reused') {
    throw new UnauthorizedError('This refresh token was already used. Please log in again.');
  }
  if (outcome.error) throw invalidRefresh();
  return outcome.result;
}

/** Always succeeds: logging out twice, or with a bad token, is not an error. */
async function logout({ refreshToken }) {
  if (!refreshToken) return;
  const session = await repo.findSessionByHash(db, hashToken(refreshToken));
  if (session) await repo.revokeSession(db, session.session_id);
}

async function getMe(userId) {
  const user = await repo.findUserById(db, userId);
  if (!user || !user.is_active) throw new UnauthorizedError('Authentication required');
  return toUserView(user);
}

async function changePassword(actor, { currentPassword, newPassword }) {
  const user = await repo.findUserById(db, actor.userId);
  if (!user || !user.is_active) throw new UnauthorizedError('Authentication required');

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw new BadRequestError('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw new BadRequestError('New password must be different from the current one');
  }

  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (client) => {
    await repo.updatePasswordHash(client, user.user_id, passwordHash);
    await repo.revokeAllSessions(client, user.user_id);
    await writeAudit(client, actor, {
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: user.user_id,
    });
  });
}

module.exports = { register, login, refresh, logout, getMe, changePassword };
