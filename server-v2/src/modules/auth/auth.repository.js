// SQL only. Each function takes `db`: the pool, or a transaction client.

const findUserByEmail = async (db, email) =>
  (await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email])).rows[0];

const insertUser = async (db, { email, name, role, passwordHash, isActive }) =>
  (
    await db.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, passwordHash, name, role, isActive],
    )
  ).rows[0];

const findUserById = async (db, userId) =>
  (await db.query('SELECT * FROM users WHERE user_id = $1', [userId])).rows[0];

/**
 * Count a wrong password. On the `maxAttempts`-th one the account is locked and the
 * counter starts again from zero. One statement, so two parallel guesses cannot both slip through.
 */
async function recordFailedLogin(db, userId, { maxAttempts, lockMinutes }) {
  const { rows } = await db.query(
    `UPDATE users SET
       failed_login_attempts = CASE WHEN failed_login_attempts + 1 >= $2 THEN 0
                                    ELSE failed_login_attempts + 1 END,
       locked_until = CASE WHEN failed_login_attempts + 1 >= $2
                           THEN now() + make_interval(mins => $3) ELSE locked_until END
     WHERE user_id = $1
     RETURNING locked_until`,
    [userId, maxAttempts, lockMinutes],
  );
  return rows[0];
}

const recordSuccessfulLogin = (db, userId) =>
  db.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now()
     WHERE user_id = $1`,
    [userId],
  );

const createSession = (db, { userId, tokenHash, expiresAt, deviceInfo }) =>
  db.query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, device_info)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, deviceInfo],
  );

/** FOR UPDATE: two refreshes with the same token wait for each other instead of both winning. */
const findSessionByHash = async (db, tokenHash) =>
  (
    await db.query('SELECT * FROM user_sessions WHERE refresh_token_hash = $1 FOR UPDATE', [
      tokenHash,
    ])
  ).rows[0];

/** Returns how many sessions were ended (0 when it was already ended). */
const revokeSession = async (db, sessionId) =>
  (
    await db.query(
      'UPDATE user_sessions SET revoked_at = now() WHERE session_id = $1 AND revoked_at IS NULL',
      [sessionId],
    )
  ).rowCount;

const revokeAllSessions = async (db, userId) =>
  (
    await db.query(
      'UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    )
  ).rowCount;

/** Also clears any lockout, because a new password is a fresh start. */
const updatePasswordHash = (db, userId, passwordHash) =>
  db.query(
    `UPDATE users SET password_hash = $2, failed_login_attempts = 0, locked_until = NULL
     WHERE user_id = $1`,
    [userId, passwordHash],
  );

module.exports = {
  findUserByEmail,
  findUserById,
  insertUser,
  recordFailedLogin,
  recordSuccessfulLogin,
  createSession,
  findSessionByHash,
  revokeSession,
  revokeAllSessions,
  updatePasswordHash,
};
