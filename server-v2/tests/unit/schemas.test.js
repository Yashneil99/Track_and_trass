const { passwordSchema } = require('../../src/shared/schemas');
const { createBody: userBody, updateBody } = require('../../src/modules/users/users.schema');

const ok = (schema, value) => schema.safeParse(value).success;

describe('passwordSchema', () => {
  test('accepts 8 to 72 bytes', () => {
    expect(ok(passwordSchema, 'x'.repeat(8))).toBe(true);
    expect(ok(passwordSchema, 'x'.repeat(72))).toBe(true);
  });

  test('refuses short and over-long passwords', () => {
    expect(ok(passwordSchema, 'x'.repeat(7))).toBe(false);
    expect(ok(passwordSchema, 'x'.repeat(73))).toBe(false);
  });

  test('counts bytes, not characters (bcrypt reads 72 bytes)', () => {
    // 40 of these characters are 80 bytes in UTF-8.
    expect(ok(passwordSchema, 'é'.repeat(40))).toBe(false);
  });
});

describe('users bodies', () => {
  test('create makes the email lower case and refuses an unknown role', () => {
    const body = {
      email: ' Ram@Example.Test ',
      name: 'Ram',
      role: 'operator',
      password: 'longenough',
    };
    expect(userBody.parse(body).email).toBe('ram@example.test');
    expect(ok(userBody, { ...body, role: 'boss' })).toBe(false);
  });

  test('update needs at least one field', () => {
    expect(ok(updateBody, {})).toBe(false);
    expect(ok(updateBody, { name: 'New name' })).toBe(true);
  });
});
