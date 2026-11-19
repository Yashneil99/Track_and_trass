const { z } = require('zod');
const { errorHandler, notFoundHandler } = require('../../src/core/errorHandler');
const { NotFoundError, ConflictError } = require('../../src/core/AppError');

function mockRes() {
  const res = { headersSent: false };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = { method: 'GET', originalUrl: '/x' };

describe('errorHandler', () => {
  test('notFoundHandler answers 404 in the standard shape', () => {
    const res = mockRes();
    notFoundHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0]).toMatchObject({ status: 404, data: null });
  });

  test('AppError keeps its status and message', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('Bag not found'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toBe('Bag not found');
  });

  test('ZodError becomes a 400 with the failing fields', () => {
    const res = mockRes();
    const result = z.object({ name: z.string() }).safeParse({});
    errorHandler(result.error, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Validation failed');
    expect(body.errors[0].path).toBe('name');
  });

  test('malformed JSON becomes a 400', () => {
    const res = mockRes();
    errorHandler({ type: 'entity.parse.failed' }, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Postgres unique violation becomes a 409', () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error('dup'), { code: '23505' }), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('Postgres foreign key violation becomes a 409', () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error('fk'), { code: '23503' }), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('an unexpected error becomes a 500 with a generic message', () => {
    const res = mockRes();
    errorHandler(new Error('secret internal detail'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe('Internal server error');
  });

  test('passes the error on when the response was already started', () => {
    const res = mockRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = new ConflictError();
    errorHandler(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
