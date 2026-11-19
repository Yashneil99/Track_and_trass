/**
 * An error we expect and can explain to the caller. Anything else that reaches the
 * error handler is treated as a bug and answered with a generic 500.
 */
class AppError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request', opts) {
    super(400, message, opts);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', opts) {
    super(401, message, opts);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do this', opts) {
    super(403, message, opts);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found', opts) {
    super(404, message, opts);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', opts) {
    super(409, message, opts);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
