const { z } = require('zod');
const {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} = require('@asteasolutions/zod-to-openapi');

// Must run before any schema calls `.openapi(...)`. Every module imports `z` from here.
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'accessToken',
});

/** The standard response shape: { status, message, data }. */
function envelope(dataSchema) {
  return z.object({
    status: z.number().int(),
    message: z.string(),
    data: dataSchema.nullable(),
  });
}

const ERROR_TEXT = {
  400: 'The request is not valid',
  401: 'Not logged in, or the token is wrong or expired',
  403: 'Your role is not allowed to do this',
  404: 'Not found',
  409: 'Conflicts with the current data',
};

/**
 * Documents one endpoint in Swagger with very little code.
 *   registerRoute({ method: 'post', path: '/users', tags: ['Users'], summary: '...',
 *                   body: createUserBody, data: userData, status: 201, errors: [409] })
 * 400 is added when the route validates input, 401 when it needs a login.
 */
function registerRoute({
  method,
  path,
  tags,
  summary,
  auth = true,
  params,
  query,
  body,
  data,
  status = 200,
  errors = [],
}) {
  const codes = new Set(errors);
  if (params || query || body) codes.add(400);
  if (auth) codes.add(401);

  const responses = {
    [status]: {
      description: 'Success',
      content: { 'application/json': { schema: envelope(data || z.null()) } },
    },
  };
  for (const code of [...codes].sort()) {
    responses[code] = {
      description: ERROR_TEXT[code] || 'Error',
      content: { 'application/json': { schema: envelope(z.null()) } },
    };
  }

  registry.registerPath({
    method,
    path,
    tags,
    summary,
    security: auth ? [{ bearerAuth: [] }, { cookieAuth: [] }] : undefined,
    request: {
      params,
      query,
      body: body ? { content: { 'application/json': { schema: body } } } : undefined,
    },
    responses,
  });
}

let cached;

/** Built once from everything the modules registered. */
function buildOpenApiDocument() {
  if (!cached) {
    const generator = new OpenApiGeneratorV3(registry.definitions);
    cached = generator.generateDocument({
      openapi: '3.0.3',
      info: {
        title: 'HUL Tea Bag Track N Trace API (v2)',
        version: '0.1.0',
        description:
          'Every response uses { status, message, data }. Log in, then use the Authorize button.',
      },
      servers: [{ url: '/' }],
    });
  }
  return cached;
}

module.exports = { z, registry, envelope, registerRoute, buildOpenApiDocument };
