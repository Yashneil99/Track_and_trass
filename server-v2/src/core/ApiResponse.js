/**
 * Every response uses one shape, compatible with the existing client:
 *   { status: <HTTP code>, message: <text>, data: <payload or null> }
 * Errors add an optional `errors` list (for example validation details).
 */
function send(res, status, message, data = null, extra = {}) {
  return res.status(status).json({ status, message, data, ...extra });
}

const ok = (res, data = null, message = 'Success') => send(res, 200, message, data);

const created = (res, data = null, message = 'Created') => send(res, 201, message, data);

const fail = (res, status, message, errors) =>
  send(res, status, message, null, errors ? { errors } : {});

module.exports = { ApiResponse: { send, ok, created, fail } };
