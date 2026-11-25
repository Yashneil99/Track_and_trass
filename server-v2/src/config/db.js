const { Pool, types } = require('pg');
const { env } = require('./env');
const { logger } = require('../core/logger');

// Postgres sends bigint (ids, counts) as text. Ours stay far below 2^53, so make them numbers.
types.setTypeParser(types.builtins.INT8, Number);

let pool;

/** One shared pool, created on first use from the validated settings only. */
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on('error', (err) => logger.error({ err }, 'unexpected error on an idle database client'));
  }
  return pool;
}

const query = (text, params) => getPool().query(text, params);

async function checkDatabase() {
  try {
    await query('SELECT 1');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function closePool() {
  if (pool) {
    const closing = pool;
    pool = undefined;
    await closing.end();
  }
}

module.exports = { getPool, query, checkDatabase, closePool };
