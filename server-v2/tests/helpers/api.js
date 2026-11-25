// Shared helpers for API tests: make users, log in, send the token.
const request = require('supertest');
const { getPool } = require('../../src/config/db');
const { hashPassword } = require('../../src/shared/password');

const PASSWORD = 'Passw0rd-test';

// Hashing is slow on purpose, so do it once and reuse the result.
let sharedHash;

/** Insert a user straight into the database (no API), return its row. */
async function insertUser({
  email,
  role = 'operator',
  name = 'Test User',
  password,
  isActive = true,
} = {}) {
  const hash = password
    ? await hashPassword(password)
    : (sharedHash ??= await hashPassword(PASSWORD));
  const { rows } = await getPool().query(
    `INSERT INTO users (email, password_hash, name, role, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email, hash, name, role, isActive],
  );
  return rows[0];
}

/** Log in through the API and return the data part of the response. */
async function login(app, email, password = PASSWORD) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  return res.body.data;
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { PASSWORD, insertUser, login, bearer };
