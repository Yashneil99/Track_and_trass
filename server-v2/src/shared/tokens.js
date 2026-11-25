const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const ALGORITHM = 'HS256';

/** Access token payload: sub = user id, plus the role used for permission checks. */
function signAccessToken(user, options = {}) {
  return jwt.sign(
    { sub: String(user.userId), role: user.role, email: user.email },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: ALGORITHM,
      expiresIn: env.ACCESS_TOKEN_TTL,
      ...options,
    },
  );
}

/** A random jwtid makes every refresh token unique, even two issued in the same second. */
function signRefreshToken(user, options = {}) {
  return jwt.sign({ sub: String(user.userId) }, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.REFRESH_TOKEN_TTL,
    jwtid: crypto.randomUUID(),
    ...options,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] });
}

/** Only this hash is stored in the database, never the refresh token itself. */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
