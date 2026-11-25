const { passwordSchema } = require('../../src/shared/schemas');

const ok = (value) => passwordSchema.safeParse(value).success;

describe('passwordSchema', () => {
  test('accepts 8 to 72 bytes', () => {
    expect(ok('x'.repeat(8))).toBe(true);
    expect(ok('x'.repeat(72))).toBe(true);
  });

  test('refuses short and over-long passwords', () => {
    expect(ok('x'.repeat(7))).toBe(false);
    expect(ok('x'.repeat(73))).toBe(false);
  });

  test('counts bytes, not characters (bcrypt reads 72 bytes)', () => {
    // 40 of these characters are 80 bytes in UTF-8.
    expect(ok('é'.repeat(40))).toBe(false);
  });
});
