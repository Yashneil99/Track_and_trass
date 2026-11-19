const { loadEnv } = require('../../src/config/env');

const valid = {
  DB_HOST: 'localhost',
  DB_USER: 'u',
  DB_PASSWORD: 'p',
  DB_NAME: 'd',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('loadEnv', () => {
  test('accepts valid settings and fills in defaults', () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(5001);
    expect(env.DB_PORT).toBe(5432);
    expect(env.NODE_ENV).toBe('development');
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  test('parses a comma separated origin list and booleans', () => {
    const env = loadEnv({
      ...valid,
      CORS_ORIGINS: 'http://a.com, http://b.com ,',
      SWAGGER_ENABLED: 'true',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
    expect(env.SWAGGER_ENABLED).toBe(true);
  });

  test('treats an empty value as not set', () => {
    const env = loadEnv({ ...valid, REDIS_URL: '', PORT: '' });
    expect(env.REDIS_URL).toBeUndefined();
    expect(env.PORT).toBe(5001);
  });

  test('reports every missing setting in one error', () => {
    expect(() => loadEnv({})).toThrow(/DB_HOST/);
    expect(() => loadEnv({})).toThrow(/JWT_ACCESS_SECRET/);
  });

  test('rejects a short secret without printing it', () => {
    const secret = 'short-secret-value';
    let message = '';
    try {
      loadEnv({ ...valid, JWT_ACCESS_SECRET: secret });
    } catch (err) {
      message = err.message;
    }
    expect(message).toMatch(/JWT_ACCESS_SECRET/);
    expect(message).not.toContain(secret);
  });

  test('rejects an unknown NODE_ENV', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  test('returns a frozen object', () => {
    expect(Object.isFrozen(loadEnv(valid))).toBe(true);
  });
});
