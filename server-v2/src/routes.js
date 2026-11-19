const express = require('express');
const healthRoutes = require('./modules/health/health.routes');

/**
 * Where every module is mounted. Each phase adds its modules here, for example:
 *   api.use('/auth', require('./modules/auth/auth.routes'));
 * Requiring a module's routes also registers its Swagger docs.
 */
function mountRoutes(app, { apiMiddleware = [] } = {}) {
  app.use(healthRoutes);

  const api = express.Router();
  // Modules are added here as they are built.
  app.use('/api/v1', ...apiMiddleware, api);
}

module.exports = { mountRoutes };
