const { randomUUID } = require('crypto');
const pinoHttp = require('pino-http');
const { logger } = require('../core/logger');

// Accept a caller's request id only if it looks safe; otherwise make one.
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * One log line per request, tagged with a request id that is also returned in the
 * X-Request-ID header. The id is what you quote when reporting a problem.
 */
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-ID', id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url === '/health' },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

module.exports = { requestLogger };
