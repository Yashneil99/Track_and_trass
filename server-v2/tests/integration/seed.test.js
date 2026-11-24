const { getPool, closePool } = require('../../src/config/db');
const { seed } = require('../../src/seeds/seed');
const { verifyPassword } = require('../../src/shared/password');
const { resetDatabase } = require('../helpers/testDb');

const q = (text, params) => getPool().query(text, params);

beforeAll(() => resetDatabase());
afterAll(closePool);

describe('seed data', () => {
  test('loads users, gardens, a warehouse tree with bins, tags and settings', async () => {
    const { password, added } = await seed(getPool(), { password: 'a-test-password' });
    expect(password).toBe('a-test-password');
    expect(added).toMatchObject({
      users: 3,
      gardens: 3,
      bin_stock: 12,
      rfid_tags: 50,
      app_settings: 1,
    });

    const roles = (await q('SELECT role FROM users ORDER BY role')).rows.map((r) => r.role);
    expect(roles).toEqual(['admin', 'operator', 'production']);

    // The password is stored hashed, and it verifies.
    const { rows } = await q(`SELECT password_hash FROM users WHERE role = 'admin'`);
    expect(rows[0].password_hash).not.toContain('a-test-password');
    expect(await verifyPassword('a-test-password', rows[0].password_hash)).toBe(true);

    // Every bin hangs under a floor, which hangs under the warehouse.
    const orphans = await q(
      `SELECT code FROM locations WHERE type IN ('floor','bin','loading_area') AND parent_id IS NULL`,
    );
    expect(orphans.rows).toEqual([]);
    const tags = await q(`SELECT DISTINCT status FROM rfid_tags`);
    expect(tags.rows.map((r) => r.status)).toEqual(['AVAILABLE']);
  });

  test('running it again adds nothing and keeps the existing password', async () => {
    const { added } = await seed(getPool(), { password: 'a-different-password' });
    expect(Object.values(added).every((n) => n === 0)).toBe(true);

    const { rows } = await q(`SELECT password_hash FROM users WHERE role = 'admin'`);
    expect(await verifyPassword('a-test-password', rows[0].password_hash)).toBe(true);
  });

  test('picks a random password when none is given', async () => {
    const { password } = await seed(getPool());
    expect(password.length).toBeGreaterThanOrEqual(10);
  });
});
