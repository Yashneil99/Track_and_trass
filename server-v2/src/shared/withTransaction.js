const { getPool } = require('../config/db');
const { logger } = require('../core/logger');

/**
 * Run `fn(client)` inside one database transaction.
 * - Success: COMMIT and return what `fn` returned.
 * - Any error: ROLLBACK and rethrow, so nothing is half saved.
 * - The connection always goes back to the pool.
 *
 * Every stock-changing step (STN upload, tag scan, putaway, dispatch) uses this.
 */
async function withTransaction(fn, pool = getPool()) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error({ err: rollbackErr }, 'rollback failed');
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
