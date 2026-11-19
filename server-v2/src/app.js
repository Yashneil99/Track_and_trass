const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const { env } = require('./config/env');
const { buildOpenApiDocument } = require('./core/openapi');
const { errorHandler, notFoundHandler } = require('./core/errorHandler');
const { requestLogger } = require('./middlewares/requestLogger');
const { generalLimiter } = require('./middlewares/rateLimit');
const { mountRoutes } = require('./routes');

const corsOptions = {
  // No Origin header means curl, a server, or same-origin: allow. Browsers must be listed.
  origin: (origin, callback) => callback(null, !origin || env.CORS_ORIGINS.includes(origin)),
  credentials: true,
};

/** Builds the Express app without starting it, so tests can use it directly. */
function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(requestLogger);

  // Swagger UI needs inline scripts, so only this path relaxes the content security policy.
  if (env.SWAGGER_ENABLED) {
    const document = buildOpenApiDocument();
    app.get('/api-docs.json', (req, res) => res.json(document));
    app.use(
      '/api-docs',
      helmet({ contentSecurityPolicy: false }),
      swaggerUi.serve,
      swaggerUi.setup(document),
    );
  }

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  mountRoutes(app, { apiMiddleware: [generalLimiter()] });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
