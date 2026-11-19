const { createClient } = require('redis');
const { env } = require('./env');
const { logger } = require('../core/logger');

let client;

/** Returns the shared client, or null when REDIS_URL is not set. */
function getRedis() {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = createClient({
      url: env.REDIS_URL,
      // Retry with a growing pause, never faster than every 5 seconds.
      socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 5_000) },
    });
    client.on('error', (err) => logger.error({ err: err.message }, 'redis error'));
    client.connect().catch(() => {});
  }
  return client;
}

async function checkRedis() {
  if (!env.REDIS_URL) return { ok: true, skipped: true };
  try {
    await getRedis().ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function closeRedis() {
  if (client) {
    const closing = client;
    client = undefined;
    try {
      await closing.quit();
    } catch {
      closing.destroy();
    }
  }
}

module.exports = { getRedis, checkRedis, closeRedis };
