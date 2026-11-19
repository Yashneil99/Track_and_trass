const { z, registry, envelope } = require('../../core/openapi');

const healthData = z.object({ uptimeSeconds: z.number().int() });

const readyData = z.object({
  database: z.enum(['up', 'down']),
  redis: z.enum(['up', 'down', 'skipped']),
});

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Is the server process alive?',
  responses: {
    200: {
      description: 'The server is running',
      content: { 'application/json': { schema: envelope(healthData) } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/ready',
  tags: ['Health'],
  summary: 'Is the server ready to serve requests? (needs the database)',
  responses: {
    200: {
      description: 'Ready',
      content: { 'application/json': { schema: envelope(readyData) } },
    },
    503: {
      description: 'The database is not reachable',
      content: { 'application/json': { schema: envelope(readyData) } },
    },
  },
});

module.exports = { healthData, readyData };
