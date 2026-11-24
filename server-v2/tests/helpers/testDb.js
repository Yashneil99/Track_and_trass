const { getPool } = require('../../src/config/db');
const { migrate } = require('../../src/migrations/runner');
const { env } = require('../../src/config/env');

/** Wipes the test database and rebuilds it from the migrations. Refuses to touch any other database. */
async function resetDatabase({ withMigrations = true } = {}) {
  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error(`Refusing to wipe "${env.DB_NAME}": test databases must end with _test`);
  }
  const pool = getPool();
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  if (withMigrations) await migrate(pool);
}

/** Runs a query and returns the error it throws (or undefined if it succeeds). */
async function errorOf(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  return undefined;
}

module.exports = { resetDatabase, errorOf };
