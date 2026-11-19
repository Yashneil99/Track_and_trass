const { withTransaction } = require('../../src/shared/withTransaction');
const { getPool, closePool } = require('../../src/config/db');

const count = async (where) =>
  Number((await getPool().query(`SELECT count(*) FROM tx_probe WHERE ${where}`)).rows[0].count);

beforeAll(async () => {
  await getPool().query('DROP TABLE IF EXISTS tx_probe');
  await getPool().query('CREATE TABLE tx_probe (id int PRIMARY KEY)');
});

afterAll(async () => {
  await getPool().query('DROP TABLE IF EXISTS tx_probe');
  await closePool();
});

describe('withTransaction (real Postgres)', () => {
  test('commits when the function succeeds and returns its result', async () => {
    const result = await withTransaction(async (client) => {
      await client.query('INSERT INTO tx_probe VALUES (1)');
      return 'done';
    });
    expect(result).toBe('done');
    expect(await count('id = 1')).toBe(1);
  });

  test('rolls everything back when the function throws', async () => {
    await expect(
      withTransaction(async (client) => {
        await client.query('INSERT INTO tx_probe VALUES (2)');
        await client.query('INSERT INTO tx_probe VALUES (3)');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await count('id IN (2, 3)')).toBe(0);
  });

  test('rolls back when a statement fails halfway (duplicate key)', async () => {
    await expect(
      withTransaction(async (client) => {
        await client.query('INSERT INTO tx_probe VALUES (4)');
        await client.query('INSERT INTO tx_probe VALUES (1)'); // already exists
      }),
    ).rejects.toMatchObject({ code: '23505' });
    expect(await count('id = 4')).toBe(0);
  });

  test('always gives the connection back to the pool', async () => {
    for (let i = 0; i < 5; i += 1) {
      await withTransaction(async () => {
        throw new Error('fail');
      }).catch(() => {});
    }
    const pool = getPool();
    expect(pool.totalCount).toBe(pool.idleCount);
  });

  test('two transactions do not see each other before commit', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const first = withTransaction(async (client) => {
      await client.query('INSERT INTO tx_probe VALUES (10)');
      await gate; // keep the first transaction open
    });
    // A second connection must not see the uncommitted row.
    await new Promise((r) => setTimeout(r, 50));
    expect(await count('id = 10')).toBe(0);
    release();
    await first;
    expect(await count('id = 10')).toBe(1);
  });
});
