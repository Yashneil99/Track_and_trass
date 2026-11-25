const jwt = require('jsonwebtoken');
const { signRefreshToken, verifyRefreshToken, hashToken } = require('../../src/shared/tokens');

describe('refresh tokens', () => {
  const user = { userId: 7, role: 'operator', email: 'a@example.test' };

  test('two tokens made in the same second for the same user are different', () => {
    // Without a random id they would be identical, and the hash column is unique.
    expect(signRefreshToken(user)).not.toBe(signRefreshToken(user));
  });

  test('a token verifies and carries only the user id', () => {
    const payload = verifyRefreshToken(signRefreshToken(user));
    expect(payload.sub).toBe('7');
    expect(payload.role).toBeUndefined();
  });

  test('a token signed with another secret is refused', () => {
    const forged = jwt.sign({ sub: '7' }, 'x'.repeat(40));
    expect(() => verifyRefreshToken(forged)).toThrow();
  });
});

describe('hashToken', () => {
  test('is the same for the same token and different for another', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  test('is a 64 character hex text, never the token itself', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
