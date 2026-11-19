const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { ApiResponse } = require('../core/ApiResponse');

function createLimiter({ windowMs = env.RATE_LIMIT_WINDOW_MS, max = env.RATE_LIMIT_MAX } = {}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => ApiResponse.fail(res, 429, 'Too many requests, please try again later'),
  });
}

/** For the whole API. */
const generalLimiter = () => createLimiter();

/** For login and token refresh, where guessing passwords is the risk. */
const authLimiter = () => createLimiter({ max: env.AUTH_RATE_LIMIT_MAX });

module.exports = { createLimiter, generalLimiter, authLimiter };
