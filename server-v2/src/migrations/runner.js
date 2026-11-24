const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SQL_DIR = path.join(__dirname, 'sql');
const FILE_PATTERN = /^(\d{3,})_([a-z0-9_]+)\.sql$/;
// Any fixed number works. It stops two processes migrating the same database at once.
const LOCK_ID = 727_001;

const checksum = (text) => crypto.createHash('sha256').update(text).digest('hex');

/** Reads the numbered .sql files in order. */
function loadMigrations(dir = SQL_DIR) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const seen = new Set();
  return files.map((file) => {
    const match = FILE_PATTERN.exec(file);
    if (!match) throw new Error(`Bad migration file name "${file}". Use 001_short_name.sql`);
    const version = match[1];
    if (seen.has(version)) throw new Error(`Two migrations share the number ${version}`);
    seen.add(version);
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    return { version, name: match[2], file, sql, checksum: checksum(sql) };
  });
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      name       text        NOT NULL,
      checksum   text        NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
}

async function appliedVersions(client) {
  const { rows } = await client.query('SELECT version, name, checksum FROM schema_migrations');
  return new Map(rows.map((r) => [r.version, r]));
}

/**
 * Applies every migration that has not run yet, in order.
 * Each file runs in its own transaction: it fully applies or not at all.
 * A file that was already applied must not change; if it did, we stop.
 */
async function migrate(pool, { dir = SQL_DIR, log = () => {} } = {}) {
  const migrations = loadMigrations(dir);
  const client = await pool.connect();
  const applied = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await ensureTable(client);
    const done = await appliedVersions(client);

    for (const m of migrations) {
      const existing = done.get(m.version);
      if (existing) {
        if (existing.checksum !== m.checksum) {
          throw new Error(
            `Migration ${m.file} was changed after it was applied. ` +
              'Never edit an applied migration; add a new one instead.',
          );
        }
        continue;
      }
      log(`applying ${m.file}`);
      try {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [m.version, m.name, m.checksum],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `Migration ${m.file} failed: ${err.message}`;
        throw err;
      }
      applied.push(m.file);
    }
    return applied;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    } finally {
      client.release();
    }
  }
}

/** Which migrations have run and which are waiting. */
async function status(pool, { dir = SQL_DIR } = {}) {
  const migrations = loadMigrations(dir);
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const done = await appliedVersions(client);
    return migrations.map((m) => ({ file: m.file, applied: done.has(m.version) }));
  } finally {
    client.release();
  }
}

module.exports = { migrate, status, loadMigrations };
