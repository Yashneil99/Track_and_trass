const { UnauthorizedError } = require('../core/AppError');
const { verifyAccessToken } = require('../shared/tokens');

/** Bearer header first (handheld, Swagger), then the accessToken cookie (web). */
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.accessToken || null;
}

/** The single login check for the whole API. Sets req.user = { userId, role, email }. */
function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) throw new UnauthorizedError('Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new UnauthorizedError(
      err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    );
  }

  req.user = { userId: payload.sub, role: payload.role, email: payload.email };
  next();
}

module.exports = { authenticate, extractToken };
