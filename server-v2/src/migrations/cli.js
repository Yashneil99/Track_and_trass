#!/usr/bin/env node
// Usage:  npm run migrate          apply every pending migration
//         npm run migrate:status   show which migrations have run
const { getPool, closePool } = require('../config/db');
const { env } = require('../config/env');
const { migrate, status } = require('./runner');

async function main() {
  const command = process.argv[2] || 'up';
  const pool = getPool();
  console.log(`Database: ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}`);

  if (command === 'up') {
    const applied = await migrate(pool, { log: (m) => console.log(m) });
    console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Already up to date.');
  } else if (command === 'status') {
    for (const m of await status(pool)) console.log(`${m.applied ? '[x]' : '[ ]'} ${m.file}`);
  } else {
    throw new Error(`Unknown command "${command}". Use: up | status`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(closePool);
