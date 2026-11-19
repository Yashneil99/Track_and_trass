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

module.exports = { z, registry, envelope, buildOpenApiDocument };
