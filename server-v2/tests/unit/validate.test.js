const { z } = require('zod');
const { validate } = require('../../src/middlewares/validate');

describe('validate', () => {
  test('puts parsed and converted values on req.validated', () => {
    const req = { params: { id: '5' }, query: { page: '2' }, body: { name: 'NGK' } };
    const next = jest.fn();
    validate({
      params: z.object({ id: z.coerce.number() }),
      query: z.object({ page: z.coerce.number().default(1) }),
      body: z.object({ name: z.string().min(1) }),
    })(req, {}, next);
    expect(next).toHaveBeenCalled();
    expect(req.validated).toEqual({ params: { id: 5 }, query: { page: 2 }, body: { name: 'NGK' } });
  });

  test('throws a ZodError for a bad body', () => {
    const req = { body: { name: '' } };
    expect(() =>
      validate({ body: z.object({ name: z.string().min(1) }) })(req, {}, jest.fn()),
    ).toThrow();
  });

  test('strips fields the schema does not know', () => {
    const req = { body: { name: 'NGK', isAdmin: true } };
    validate({ body: z.object({ name: z.string() }) })(req, {}, jest.fn());
    expect(req.validated.body).toEqual({ name: 'NGK' });
  });
});
