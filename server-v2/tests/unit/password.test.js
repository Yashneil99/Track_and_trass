const bcrypt = require('bcryptjs');
const { hashPassword, verifyPassword } = require('../../src/shared/password');

describe('password hashing', () => {
  test('a password verifies against its own hash, and a wrong one does not', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  test('the same password gets a different hash each time (salted)', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  test('accepts a hash made the way the old server made it (bcryptjs, cost 10)', async () => {
    const oldStyleHash = await bcrypt.hash('old-password', 10);
    expect(await verifyPassword('old-password', oldStyleHash)).toBe(true);
    expect(await verifyPassword('other', oldStyleHash)).toBe(false);
  });
});
