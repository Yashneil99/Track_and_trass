const { ZodError } = require('zod');
const { env } = require('../config/env');
const { logger } = require('./logger');
const { AppError } = require('./AppError');
const { ApiResponse } = require('./ApiResponse');

// Postgres error codes we can explain to the caller.
const PG_ERRORS = {
  23505: [409, 'This record already exists'],
  23503: [409, 'A related record is missing, or this record is still in use'],
  23502: [400, 'A required value is missing'],
  23514: [400, 'A value is not allowed'],
  '22P02': [400, 'A value has the wrong format'],
};

function notFoundHandler(req, res) {
  return ApiResponse.fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// Express needs all four parameters to treat this as an error handler.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return ApiResponse.fail(res, 400, 'Validation failed', errors);
  }

  if (err.type === 'entity.parse.failed') {
    return ApiResponse.fail(res, 400, 'Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return ApiResponse.fail(res, 413, 'Request body is too large');
  }

  if (err instanceof AppError) {
    const errors = err.details ? [].concat(err.details) : undefined;
    return ApiResponse.fail(res, err.statusCode, err.message, errors);
  }

  if (err.code && PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return ApiResponse.fail(res, status, message);
  }

  // A bug. Log everything, tell the caller as little as possible.
  (req.log || logger).error({ err }, 'unhandled error');
  const errors = env.NODE_ENV === 'production' ? undefined : [{ message: err.message }];
  return ApiResponse.fail(res, 500, 'Internal server error', errors);
}

module.exports = { errorHandler, notFoundHandler };
