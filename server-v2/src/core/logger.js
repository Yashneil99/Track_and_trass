const pino = require('pino');
const { env } = require('../config/env');

// Anything matching these paths is replaced before it is written. Tokens, cookies and
// passwords must never reach a log file.
const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-csrf-token"]',
    'res.headers["set-cookie"]',
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    '*.password',
    '*.passwordHash',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.secret',
  ],
  censor: '[REDACTED]',
};

/** Build a logger. `destination` is only passed by tests that capture the output. */
function buildLogger(destination) {
  return pino({ level: env.LOG_LEVEL, redact }, destination);
}

const logger = buildLogger();

module.exports = { logger, buildLogger };
