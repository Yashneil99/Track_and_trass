const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool, getPool } = require('../../src/config/db');
const { resetDatabase } = require('../helpers/testDb');
const { PASSWORD, insertUser, login, bearer } = require('../helpers/api');

const app = createApp();
const post = (path) => request(app).post(`/api/v1/auth${path}`);

beforeAll(async () => {
  await resetDatabase();
  await insertUser({ email: 'ram@example.test', role: 'operator', name: 'Ram' });
});

afterAll(async () => {
  await closePool();
});

describe('POST /auth/register', () => {
  const body = (overrides = {}) => ({
    name: 'New Joiner',
    email: 'joiner@example.test',
    password: 'Joiner-Pass-1',
    ...overrides,
  });

  test('creates an account that is switched off, with the operator role', async () => {
    const res = await post('/register').send(body());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      email: 'joiner@example.test',
      name: 'New Joiner',
      role: 'operator',
      isActive: false,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('cannot log in until an admin switches the account on', async () => {
    const before = await post('/login').send({
      email: 'joiner@example.test',
      password: 'Joiner-Pass-1',
    });
    expect(before.status).toBe(403);

    await getPool().query("UPDATE users SET is_active = true WHERE email = 'joiner@example.test'");
    const after = await post('/login').send({
      email: 'joiner@example.test',
      password: 'Joiner-Pass-1',
    });
    expect(after.status).toBe(200);
  });

  test('a role sent by the caller is ignored', async () => {
    const res = await post('/register').send(body({ email: 'sneaky@example.test', role: 'admin' }));
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('operator');
  });

  test('the same email, in other capitals, is a 409', async () => {
    const res = await post('/register').send(body({ email: 'JOINER@example.test' }));
    expect(res.status).toBe(409);
  });

  test('refuses a weak password, a bad email and a missing name', async () => {
    const weak = await post('/register').send(
      body({ email: 'a1@example.test', password: 'short' }),
    );
    const email = await post('/register').send(body({ email: 'not-an-email' }));
    const name = await post('/register').send({
      email: 'a2@example.test',
      password: 'Joiner-Pass-1',
    });
    expect(weak.status).toBe(400);
    expect(email.status).toBe(400);
    expect(name.status).toBe(400);
  });

  test('is written to the audit log, without a user (nobody was logged in)', async () => {
    const { rows } = await getPool().query(
      "SELECT user_id, details FROM audit_logs WHERE action = 'USER_REGISTERED' ORDER BY log_id LIMIT 1",
    );
    expect(rows[0].user_id).toBeNull();
    expect(rows[0].details.email).toBe('joiner@example.test');
  });
});

describe('POST /auth/login', () => {
  test('logs in, returns both tokens, and sets httpOnly cookies', async () => {
    const res = await post('/login').send({ email: 'ram@example.test', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: 'ram@example.test', role: 'operator' });
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/accessToken=.*HttpOnly/);
    expect(cookies).toMatch(/refreshToken=.*Path=\/api\/v1\/auth/);
  });

  test('never returns the password hash', async () => {
    const res = await post('/login').send({ email: 'ram@example.test', password: PASSWORD });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('the email is not case sensitive', async () => {
    const res = await post('/login').send({ email: 'RAM@Example.Test', password: PASSWORD });
    expect(res.status).toBe(200);
  });

  test('a wrong password and an unknown email give the same answer', async () => {
    const wrong = await post('/login').send({ email: 'ram@example.test', password: 'nope-nope' });
    const unknown = await post('/login').send({ email: 'nobody@example.test', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test('a missing password is a 400', async () => {
    const res = await post('/login').send({ email: 'ram@example.test' });
    expect(res.status).toBe(400);
  });

  test('a disabled account is refused only when the password is right', async () => {
    await insertUser({ email: 'off@example.test', isActive: false });
    const right = await post('/login').send({ email: 'off@example.test', password: PASSWORD });
    const wrong = await post('/login').send({ email: 'off@example.test', password: 'nope-nope' });
    expect(right.status).toBe(403);
    expect(wrong.status).toBe(401);
  });

  test('five wrong passwords lock the account, even for the right password', async () => {
    await insertUser({ email: 'locky@example.test' });
    for (let i = 0; i < 5; i++) {
      const res = await post('/login').send({
        email: 'locky@example.test',
        password: 'wrong-pass',
      });
      expect(res.status).toBe(401);
    }
    const locked = await post('/login').send({ email: 'locky@example.test', password: PASSWORD });
    expect(locked.status).toBe(403);
    expect(locked.body.message).toMatch(/locked/i);
  });

  test('when the lock time has passed the user can log in, and the counter resets', async () => {
    await insertUser({ email: 'later@example.test' });
    for (let i = 0; i < 5; i++) {
      await post('/login').send({ email: 'later@example.test', password: 'wrong-pass' });
    }
    await getPool().query(
      "UPDATE users SET locked_until = now() - interval '1 minute' WHERE email = 'later@example.test'",
    );
    const res = await post('/login').send({ email: 'later@example.test', password: PASSWORD });
    expect(res.status).toBe(200);
    const { rows } = await getPool().query(
      "SELECT failed_login_attempts, locked_until FROM users WHERE email = 'later@example.test'",
    );
    expect(rows[0]).toEqual({ failed_login_attempts: 0, locked_until: null });
  });
});

describe('GET /auth/me', () => {
  test('returns the user for a Bearer token', async () => {
    const { accessToken } = await login(app, 'ram@example.test');
    const res = await request(app).get('/api/v1/auth/me').set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: 'ram@example.test', name: 'Ram' });
  });

  test('also works with the accessToken cookie', async () => {
    const { accessToken } = await login(app, 'ram@example.test');
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `accessToken=${accessToken}`);
    expect(res.status).toBe(200);
  });

  test('is 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('is 401 once the account has been disabled', async () => {
    const user = await insertUser({ email: 'soon-off@example.test' });
    const { accessToken } = await login(app, 'soon-off@example.test');
    await getPool().query('UPDATE users SET is_active = false WHERE user_id = $1', [user.user_id]);
    const res = await request(app).get('/api/v1/auth/me').set(bearer(accessToken));
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  test('swaps a refresh token for a new pair', async () => {
    const first = await login(app, 'ram@example.test');
    const res = await post('/refresh').send({ refreshToken: first.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).not.toBe(first.refreshToken);
    const me = await request(app).get('/api/v1/auth/me').set(bearer(res.body.data.accessToken));
    expect(me.status).toBe(200);
  });

  test('reads the refresh token from the cookie when the body is empty', async () => {
    const first = await login(app, 'ram@example.test');
    const res = await post('/refresh').set('Cookie', `refreshToken=${first.refreshToken}`);
    expect(res.status).toBe(200);
  });

  test('an old refresh token cannot be used twice, and a second use ends every login', async () => {
    const first = await login(app, 'ram@example.test');
    const second = await post('/refresh').send({ refreshToken: first.refreshToken });
    expect(second.status).toBe(200);

    const replay = await post('/refresh').send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/already used/i);

    // The new token from the legitimate refresh is ended too.
    const afterReplay = await post('/refresh').send({
      refreshToken: second.body.data.refreshToken,
    });
    expect(afterReplay.status).toBe(401);
  });

  test('rejects garbage and a missing token', async () => {
    expect((await post('/refresh').send({ refreshToken: 'garbage' })).status).toBe(401);
    expect((await post('/refresh').send({})).status).toBe(401);
  });

  test('a disabled user cannot refresh', async () => {
    const user = await insertUser({ email: 'gone@example.test' });
    const { refreshToken } = await login(app, 'gone@example.test');
    await getPool().query('UPDATE users SET is_active = false WHERE user_id = $1', [user.user_id]);
    const res = await post('/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  test('the new access token carries the role the user has now', async () => {
    const user = await insertUser({ email: 'promoted@example.test', role: 'operator' });
    const { refreshToken } = await login(app, 'promoted@example.test');
    await getPool().query("UPDATE users SET role = 'admin' WHERE user_id = $1", [user.user_id]);
    const res = await post('/refresh').send({ refreshToken });
    expect(res.body.data.user.role).toBe('admin');
  });
});

describe('POST /auth/logout', () => {
  test('ends the login, so its refresh token stops working', async () => {
    const { refreshToken } = await login(app, 'ram@example.test');
    const out = await post('/logout').send({ refreshToken });
    expect(out.status).toBe(200);
    const res = await post('/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  test('is fine with no token or a bad one', async () => {
    expect((await post('/logout').send({})).status).toBe(200);
    expect((await post('/logout').send({ refreshToken: 'garbage' })).status).toBe(200);
  });
});

describe('POST /auth/change-password', () => {
  const NEW_PASSWORD = 'Another-Pass-9';

  test('needs a login', async () => {
    const res = await post('/change-password').send({
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(res.status).toBe(401);
  });

  test('refuses a wrong current password', async () => {
    await insertUser({ email: 'pw1@example.test' });
    const { accessToken } = await login(app, 'pw1@example.test');
    const res = await post('/change-password')
      .set(bearer(accessToken))
      .send({ currentPassword: 'not-it-at-all', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
  });

  test('refuses a weak, too long, or unchanged new password', async () => {
    await insertUser({ email: 'pw2@example.test' });
    const { accessToken } = await login(app, 'pw2@example.test');
    const send = (newPassword) =>
      post('/change-password')
        .set(bearer(accessToken))
        .send({ currentPassword: PASSWORD, newPassword });

    expect((await send('short')).status).toBe(400);
    expect((await send('x'.repeat(73))).status).toBe(400);
    expect((await send(PASSWORD)).status).toBe(400);
  });

  test('changes the password and ends every login', async () => {
    await insertUser({ email: 'pw3@example.test' });
    const { accessToken, refreshToken } = await login(app, 'pw3@example.test');

    const res = await post('/change-password')
      .set(bearer(accessToken))
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);

    const oldLogin = await post('/login').send({ email: 'pw3@example.test', password: PASSWORD });
    const newLogin = await post('/login').send({
      email: 'pw3@example.test',
      password: NEW_PASSWORD,
    });
    const oldRefresh = await post('/refresh').send({ refreshToken });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
    expect(oldRefresh.status).toBe(401);
  });

  test('is written to the audit log', async () => {
    const { rows } = await getPool().query(
      "SELECT action FROM audit_logs WHERE action = 'PASSWORD_CHANGED'",
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
