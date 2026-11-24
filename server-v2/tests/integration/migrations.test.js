const fs = require('fs');
const os = require('os');
const path = require('path');
const { getPool, closePool } = require('../../src/config/db');
const { migrate, status, loadMigrations } = require('../../src/migrations/runner');
const { resetDatabase, errorOf } = require('../helpers/testDb');

const q = (text, params) => getPool().query(text, params);

/** A throwaway folder of migration files for testing the runner itself. */
function tempMigrations(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql);
  return dir;
}

beforeEach(() => resetDatabase({ withMigrations: false }));
afterAll(closePool);

describe('migration runner', () => {
  test('applies every real migration to an empty database', async () => {
    const applied = await migrate(getPool());
    expect(applied).toEqual(loadMigrations().map((m) => m.file));

    const { rows } = await q(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [['users', 'bags', 'stn_lots', 'bin_stock', 'rfid_tags', 'bag_events', 'alerts']],
    );
    expect(rows[0].n).toBe(7);
  });

  test('running twice changes nothing the second time', async () => {
    await migrate(getPool());
    expect(await migrate(getPool())).toEqual([]);
    expect((await status(getPool())).every((m) => m.applied)).toBe(true);
  });

  test('a failing migration rolls back completely and later files do not run', async () => {
    const dir = tempMigrations({
      '001_ok.sql': 'CREATE TABLE first_table (id int);',
      '002_bad.sql': 'CREATE TABLE half_done (id int); SELECT * FROM table_that_does_not_exist;',
      '003_never.sql': 'CREATE TABLE third_table (id int);',
    });

    const err = await errorOf(migrate(getPool(), { dir }));
    expect(err.message).toMatch(/002_bad\.sql failed/);

    const { rows } = await q(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tables = rows.map((r) => r.table_name);
    expect(tables).toContain('first_table'); // 001 was committed on its own
    expect(tables).not.toContain('half_done'); // 002 rolled back entirely
    expect(tables).not.toContain('third_table');
  });

  test('refuses to continue when an applied migration file was edited', async () => {
    const dir = tempMigrations({ '001_one.sql': 'CREATE TABLE one (id int);' });
    await migrate(getPool(), { dir });

    fs.writeFileSync(path.join(dir, '001_one.sql'), 'CREATE TABLE one (id int, extra int);');
    const err = await errorOf(migrate(getPool(), { dir }));
    expect(err.message).toMatch(/was changed after it was applied/);
  });

  test('rejects badly named files and duplicate numbers', () => {
    expect(() => loadMigrations(tempMigrations({ 'create_users.sql': 'SELECT 1;' }))).toThrow(
      /Bad migration file name/,
    );
    expect(() =>
      loadMigrations(tempMigrations({ '001_a.sql': 'SELECT 1;', '001_b.sql': 'SELECT 1;' })),
    ).toThrow(/share the number 001/);
  });
});
