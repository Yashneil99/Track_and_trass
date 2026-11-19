const request = require('supertest');
const express = require('express');
const { createApp } = require('../../src/app');
const db = require('../../src/config/db');
const { createLimiter } = require('../../src/middlewares/rateLimit');

const app = createApp();

afterAll(async () => {
  await db.closePool();
});

describe('health', () => {
  test('GET /health answers 200 in the standard shape', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 200, message: 'OK' });
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  test('GET /ready is 200 when the database answers', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ database: 'up', redis: 'skipped' });
  });

  test('GET /ready is 503 when the database is down', async () => {
    jest.spyOn(db, 'checkDatabase').mockResolvedValueOnce({ ok: false, error: 'down' });
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 503, message: 'Not ready' });
    expect(res.body.data.database).toBe('down');
  });
});

describe('request handling', () => {
  test('every response carries an X-Request-ID', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  test('a safe incoming X-Request-ID is kept', async () => {
    const res = await request(app).get('/health').set('X-Request-ID', 'trace-12345678');
    expect(res.headers['x-request-id']).toBe('trace-12345678');
  });

  test('an unsafe incoming X-Request-ID is replaced', async () => {
    const res = await request(app).get('/health').set('X-Request-ID', 'bad id with spaces');
    expect(res.headers['x-request-id']).not.toBe('bad id with spaces');
  });

  test('unknown routes answer 404 in the standard shape', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, data: null });
    expect(res.body.message).toMatch(/GET \/nope/);
  });

  test('malformed JSON answers 400 in the standard shape', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{ not json');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ status: 400, message: 'Request body is not valid JSON' });
  });

  test('does not announce the framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  test('allows a listed origin with credentials', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('does not allow an unlisted origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Swagger', () => {
  test('/api-docs.json lists the health endpoints', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(Object.keys(res.body.paths)).toEqual(expect.arrayContaining(['/health', '/ready']));
  });

  test('/api-docs serves the Swagger page', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });
});

describe('rate limit', () => {
  test('answers 429 in the standard shape once the limit is passed', async () => {
    const small = express();
    small.use(createLimiter({ windowMs: 60_000, max: 2 }));
    small.get('/x', (req, res) => res.json({ ok: true }));
    await request(small).get('/x');
    await request(small).get('/x');
    const res = await request(small).get('/x');
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ status: 429, data: null });
  });
});
