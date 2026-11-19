const { UnauthorizedError, ForbiddenError } = require('../core/AppError');

/** Use after `authenticate`. Allows only the listed roles, for example authorize(ROLES.ADMIN). */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (roles.length > 0 && !roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}

module.exports = { authorize };
