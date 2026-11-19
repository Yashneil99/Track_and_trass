/**
 * Validate params, query and body with Zod schemas. Parsed values are put on
 * `req.validated` (Express 5 does not allow replacing req.query).
 * A failure throws a ZodError, which the error handler turns into a 400.
 *
 *   router.post('/x', validate({ body: createXSchema }), controller)
 */
function validate({ params, query, body } = {}) {
  return (req, res, next) => {
    req.validated = {};
    if (params) req.validated.params = params.parse(req.params);
    if (query) req.validated.query = query.parse(req.query);
    if (body) req.validated.body = body.parse(req.body);
    next();
  };
}

module.exports = { validate };
