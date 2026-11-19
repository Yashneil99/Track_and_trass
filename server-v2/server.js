/* eslint-disable no-console */
let env;
try {
  ({ env } = require('./src/config/env'));
} catch (err) {
  // Bad or missing settings: say exactly which ones, then stop.
  console.error(err.message);
  process.exit(1);
}

const { logger } = require('./src/core/logger');
const { createApp } = require('./src/app');
const { closePool } = require('./src/config/db');
const { closeRedis } = require('./src/config/redis');

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server-v2 listening');
});

server.on('error', (err) => {
  logger.fatal({ err }, 'server failed to start');
  process.exit(1);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  // Give open requests 10 seconds, then stop regardless.
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await closePool();
    await closeRedis();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'unhandled promise rejection');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
