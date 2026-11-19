const jwt = require('jsonwebtoken');
const { authenticate } = require('../../src/middlewares/authenticate');
const { authorize } = require('../../src/middlewares/authorize');
const { signAccessToken } = require('../../src/shared/tokens');
const { ROLES } = require('../../src/shared/roles');

const user = { userId: 7, role: ROLES.OPERATOR, email: 'op@example.com' };

describe('authenticate', () => {
  test('accepts a Bearer token and sets req.user', () => {
    const req = { headers: { authorization: `Bearer ${signAccessToken(user)}` } };
    const next = jest.fn();
    authenticate(req, {}, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: '7', role: 'operator', email: 'op@example.com' });
  });

  test('accepts the accessToken cookie', () => {
    const req = { headers: {}, cookies: { accessToken: signAccessToken(user) } };
    authenticate(req, {}, jest.fn());
    expect(req.user.userId).toBe('7');
  });

  test('prefers the Bearer header over the cookie', () => {
    const req = {
      headers: { authorization: `Bearer ${signAccessToken({ ...user, userId: 1 })}` },
      cookies: { accessToken: signAccessToken({ ...user, userId: 2 }) },
    };
    authenticate(req, {}, jest.fn());
    expect(req.user.userId).toBe('1');
  });

  test('rejects a request with no token', () => {
    expect(() => authenticate({ headers: {} }, {}, jest.fn())).toThrow('Authentication required');
  });

  test('rejects an expired token', () => {
    const token = signAccessToken(user, { expiresIn: -10 });
    expect(() =>
      authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, jest.fn()),
    ).toThrow('Token expired');
  });

  test('rejects a token signed with another secret', () => {
    const token = jwt.sign({ sub: '7', role: 'admin' }, 'x'.repeat(40));
    expect(() =>
      authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, jest.fn()),
    ).toThrow('Invalid token');
  });

  test('rejects an unsigned token', () => {
    const token = jwt.sign({ sub: '7', role: 'admin' }, '', { algorithm: 'none' });
    expect(() =>
      authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, jest.fn()),
    ).toThrow('Invalid token');
  });
});

describe('authorize', () => {
  test('lets a listed role through', () => {
    const next = jest.fn();
    authorize(ROLES.ADMIN)({ user: { role: 'admin' } }, {}, next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks a role that is not listed with 403', () => {
    try {
      authorize(ROLES.ADMIN)({ user: { role: 'operator' } }, {}, jest.fn());
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.statusCode).toBe(403);
    }
  });

  test('answers 401 when nobody is logged in', () => {
    try {
      authorize(ROLES.ADMIN)({}, {}, jest.fn());
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.statusCode).toBe(401);
    }
  });

  test('with no roles listed, any logged in user passes', () => {
    const next = jest.fn();
    authorize()({ user: { role: 'operator' } }, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
