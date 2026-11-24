#!/usr/bin/env node
// Usage:  npm run seed
// Set SEED_PASSWORD to choose the test users' password; otherwise a random one is printed once.
const { getPool, closePool } = require('../config/db');
const { env } = require('../config/env');
const { seed, USERS } = require('./seed');

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to load test data into a production database.');
  }
  console.log(`Database: ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}`);
  const { password, added } = await seed(getPool(), { password: process.env.SEED_PASSWORD });

  console.log('Added:', JSON.stringify(added));
  if (added.users) {
    console.log('\nTest users (all share one password):');
    USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
    console.log(`  password: ${password}`);
  } else {
    console.log('Test users already existed; their password was not changed.');
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(closePool);
