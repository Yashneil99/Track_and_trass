const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool, getPool } = require('../../src/config/db');
const { resetDatabase } = require('../helpers/testDb');
const { PASSWORD, insertUser, login, bearer } = require('../helpers/api');

const app = createApp();
const api = (method, path, token) => {
  const call = request(app)[method](`/api/v1${path}`);
  return token ? call.set(bearer(token)) : call;
};

let adminToken;
let operatorToken;
let admin;

beforeAll(async () => {
  await resetDatabase();
  admin = await insertUser({ email: 'admin@example.test', role: 'admin', name: 'Admin' });
  await insertUser({ email: 'operator@example.test', role: 'operator', name: 'Operator' });
  adminToken = (await login(app, 'admin@example.test')).accessToken;
  operatorToken = (await login(app, 'operator@example.test')).accessToken;
});

afterAll(async () => {
  await closePool();
});

const newUser = (overrides = {}) => ({
  email: 'new@example.test',
  name: 'New Person',
  role: 'operator',
  password: 'Initial-Pass-1',
  ...overrides,
});

describe('who may use /users', () => {
  test('no login is 401', async () => {
    expect((await api('get', '/users')).status).toBe(401);
  });

  test('an operator is 403 on every route', async () => {
    expect((await api('get', '/users', operatorToken)).status).toBe(403);
    expect((await api('post', '/users', operatorToken).send(newUser())).status).toBe(403);
    expect((await api('patch', '/users/1', operatorToken).send({ name: 'x' })).status).toBe(403);
  });
});

describe('POST /users', () => {
  test('creates a user who can then log in', async () => {
    const res = await api('post', '/users', adminToken).send(newUser());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      email: 'new@example.test',
      role: 'operator',
      isActive: true,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const session = await login(app, 'new@example.test', 'Initial-Pass-1');
    expect(session.user.name).toBe('New Person');
  });

  test('the same email in other capitals is a 409', async () => {
    const res = await api('post', '/users', adminToken).send(
      newUser({ email: 'NEW@example.test' }),
    );
    expect(res.status).toBe(409);
  });

  test('refuses a weak password and an unknown role', async () => {
    const weak = await api('post', '/users', adminToken).send(
      newUser({ email: 'a@e.test', password: 'abc' }),
    );
    const role = await api('post', '/users', adminToken).send(
      newUser({ email: 'b@e.test', role: 'boss' }),
    );
    expect(weak.status).toBe(400);
    expect(role.status).toBe(400);
    expect(weak.body.errors[0].path).toBe('password');
  });

  test('is written to the audit log with who did it', async () => {
    const { rows } = await getPool().query(
      "SELECT user_id, entity_id FROM audit_logs WHERE action = 'USER_CREATED' ORDER BY log_id LIMIT 1",
    );
    expect(rows[0].user_id).toBe(admin.user_id);
  });
});

describe('GET /users', () => {
  beforeAll(async () => {
    await insertUser({ email: 'sita@example.test', name: 'Sita Devi', role: 'production' });
    await insertUser({
      email: 'gita@example.test',
      name: 'Gita',
      role: 'operator',
      isActive: false,
    });
  });

  test('lists with paging details', async () => {
    const res = await api('get', '/users?limit=2&page=1', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data).toMatchObject({ page: 1, limit: 2 });
    expect(res.body.data.total).toBeGreaterThanOrEqual(5);
  });

  test('the next page has different people', async () => {
    const one = await api('get', '/users?limit=2&page=1', adminToken);
    const two = await api('get', '/users?limit=2&page=2', adminToken);
    const ids = [...one.body.data.items, ...two.body.data.items].map((u) => u.userId);
    expect(new Set(ids).size).toBe(4);
  });

  test('filters by role, by active state, and by text in name or email', async () => {
    const byRole = await api('get', '/users?role=production', adminToken);
    expect(byRole.body.data.items.map((u) => u.email)).toEqual(['sita@example.test']);

    const inactive = await api('get', '/users?isActive=false', adminToken);
    expect(inactive.body.data.items.map((u) => u.email)).toEqual(['gita@example.test']);

    const byText = await api('get', '/users?q=DEVI', adminToken);
    expect(byText.body.data.items.map((u) => u.email)).toEqual(['sita@example.test']);
  });

  test('a percent sign in the search is just a character, not "match everything"', async () => {
    const res = await api('get', '/users?q=%25', adminToken);
    expect(res.body.data.total).toBe(0);
  });

  test('refuses a limit above 100 and a bad role', async () => {
    expect((await api('get', '/users?limit=101', adminToken)).status).toBe(400);
    expect((await api('get', '/users?role=boss', adminToken)).status).toBe(400);
  });
});

describe('GET /users/:userId', () => {
  test('returns the user, 404 for a missing one, 400 for a bad id', async () => {
    expect((await api('get', `/users/${admin.user_id}`, adminToken)).body.data.email).toBe(
      'admin@example.test',
    );
    expect((await api('get', '/users/999999', adminToken)).status).toBe(404);
    expect((await api('get', '/users/abc', adminToken)).status).toBe(400);
  });
});

describe('PATCH /users/:userId', () => {
  test('changes name and role', async () => {
    const user = await insertUser({ email: 'edit@example.test', name: 'Before' });
    const res = await api('patch', `/users/${user.user_id}`, adminToken).send({
      name: 'After',
      role: 'production',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'After', role: 'production' });
  });

  test('refuses an email another user has, and an empty change', async () => {
    const user = await insertUser({ email: 'dup@example.test' });
    const taken = await api('patch', `/users/${user.user_id}`, adminToken).send({
      email: 'operator@example.test',
    });
    const empty = await api('patch', `/users/${user.user_id}`, adminToken).send({});
    expect(taken.status).toBe(409);
    expect(empty.status).toBe(400);
  });

  test('an admin cannot change their own role', async () => {
    const res = await api('patch', `/users/${admin.user_id}`, adminToken).send({
      role: 'operator',
    });
    expect(res.status).toBe(400);
  });

  test('404 for a user that does not exist', async () => {
    expect((await api('patch', '/users/999999', adminToken).send({ name: 'x' })).status).toBe(404);
  });
});

describe('PATCH /users/:userId/status', () => {
  test('disabling ends their logins and stops new ones; enabling brings them back', async () => {
    const user = await insertUser({ email: 'shift@example.test' });
    const { refreshToken } = await login(app, 'shift@example.test');

    const off = await api('patch', `/users/${user.user_id}/status`, adminToken).send({
      isActive: false,
    });
    expect(off.status).toBe(200);
    expect(off.body.data.isActive).toBe(false);

    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    const loginAgain = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'shift@example.test', password: PASSWORD });
    expect(refresh.status).toBe(401);
    expect(loginAgain.status).toBe(403);

    await api('patch', `/users/${user.user_id}/status`, adminToken).send({ isActive: true });
    expect((await login(app, 'shift@example.test')).user.isActive).toBe(true);
  });

  test('an admin cannot disable themselves', async () => {
    const res = await api('patch', `/users/${admin.user_id}/status`, adminToken).send({
      isActive: false,
    });
    expect(res.status).toBe(400);
  });
});

describe('the last active admin is protected', () => {
  test('two admins demoting each other at the same moment: one wins, one is refused', async () => {
    await resetDatabase();
    const a = await insertUser({ email: 'a@example.test', role: 'admin' });
    const b = await insertUser({ email: 'b@example.test', role: 'admin' });
    const tokenA = (await login(app, 'a@example.test')).accessToken;
    const tokenB = (await login(app, 'b@example.test')).accessToken;

    const [first, second] = await Promise.all([
      api('patch', `/users/${b.user_id}`, tokenA).send({ role: 'operator' }),
      api('patch', `/users/${a.user_id}`, tokenB).send({ role: 'operator' }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const { rows } = await getPool().query(
      "SELECT count(*) AS n FROM users WHERE role = 'admin' AND is_active",
    );
    expect(rows[0].n).toBe(1);
  });
});

describe('POST /users/:userId/reset-password', () => {
  test('sets a new password, ends their logins and clears a lockout', async () => {
    await resetDatabase();
    await insertUser({ email: 'admin@example.test', role: 'admin' });
    const user = await insertUser({ email: 'forgot@example.test' });
    const token = (await login(app, 'admin@example.test')).accessToken;
    const { refreshToken } = await login(app, 'forgot@example.test');
    await getPool().query(
      "UPDATE users SET locked_until = now() + interval '10 minutes' WHERE user_id = $1",
      [user.user_id],
    );

    const res = await api('post', `/users/${user.user_id}/reset-password`, token).send({
      newPassword: 'Brand-New-Pass-2',
    });
    expect(res.status).toBe(200);

    const oldPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'forgot@example.test', password: PASSWORD });
    expect(oldPassword.status).toBe(401);
    expect((await login(app, 'forgot@example.test', 'Brand-New-Pass-2')).user.email).toBe(
      'forgot@example.test',
    );
    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);
  });

  test('refuses your own account, a weak password, and a missing user', async () => {
    await resetDatabase();
    const me = await insertUser({ email: 'admin@example.test', role: 'admin' });
    const token = (await login(app, 'admin@example.test')).accessToken;

    const self = await api('post', `/users/${me.user_id}/reset-password`, token).send({
      newPassword: 'Brand-New-Pass-2',
    });
    const weak = await api('post', `/users/${me.user_id}/reset-password`, token).send({
      newPassword: 'x',
    });
    const missing = await api('post', '/users/999999/reset-password', token).send({
      newPassword: 'Brand-New-Pass-2',
    });
    expect(self.status).toBe(400);
    expect(weak.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});
