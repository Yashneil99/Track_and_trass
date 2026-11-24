// Test data for development. Safe to run again: it never duplicates or overwrites rows.
// Everything here is made up. No real business data belongs in this file.
const crypto = require('crypto');
const { hashPassword } = require('../shared/password');

const USERS = [
  { email: 'admin@example.test', name: 'Test Admin', role: 'admin' },
  { email: 'operator@example.test', name: 'Test Operator', role: 'operator' },
  { email: 'production@example.test', name: 'Test Production', role: 'production' },
];

const GARDENS = ['SAMPLE GARDEN ONE', 'SAMPLE GARDEN TWO', 'SAMPLE GARDEN THREE'];

const BIN_CAPACITY = 500;
const BINS_PER_FLOOR = 6;
const FLOORS = ['1f', '2f'];
const TAG_COUNT = 50;

/**
 * @param {import('pg').Pool} pool
 * @param {{ password?: string }} options  password for the test users; random if omitted
 * @returns the password that was used, and what was inserted
 */
async function seed(pool, { password } = {}) {
  const plainPassword = password || crypto.randomBytes(9).toString('base64url');
  const passwordHash = await hashPassword(plainPassword);
  const client = await pool.connect();
  const added = {};
  const count = (key, result) => {
    added[key] = (added[key] || 0) + result.rowCount;
  };

  try {
    await client.query('BEGIN');

    for (const u of USERS) {
      count(
        'users',
        await client.query(
          `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
           ON CONFLICT (lower(email)) DO NOTHING`,
          [u.email, passwordHash, u.name, u.role],
        ),
      );
    }

    for (const name of GARDENS) {
      count(
        'gardens',
        await client.query('INSERT INTO gardens (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [
          name,
        ]),
      );
    }

    // Warehouse -> floors -> bins, plus a loading area.
    count(
      'locations',
      await client.query(
        `INSERT INTO locations (code, name, type) VALUES ('hul_wh', 'Test Warehouse', 'warehouse')
         ON CONFLICT (code) DO NOTHING`,
      ),
    );
    count(
      'locations',
      await client.query(
        `INSERT INTO locations (code, name, type, parent_id)
         SELECT 'hul_loading', 'Loading Area', 'loading_area', location_id
         FROM locations WHERE code = 'hul_wh'
         ON CONFLICT (code) DO NOTHING`,
      ),
    );
    for (const floor of FLOORS) {
      count(
        'locations',
        await client.query(
          `INSERT INTO locations (code, name, type, parent_id)
           SELECT $1, $2, 'floor', location_id FROM locations WHERE code = 'hul_wh'
           ON CONFLICT (code) DO NOTHING`,
          [`hul_${floor}`, `Floor ${floor.toUpperCase()}`],
        ),
      );
      for (let n = 1; n <= BINS_PER_FLOOR; n++) {
        count(
          'locations',
          await client.query(
            `INSERT INTO locations (code, name, type, parent_id)
             SELECT $1, $2, 'bin', location_id FROM locations WHERE code = $3
             ON CONFLICT (code) DO NOTHING`,
            [`hul_${floor}_bin_${n}`, `Bin ${n} (${floor.toUpperCase()})`, `hul_${floor}`],
          ),
        );
      }
    }
    count(
      'bin_stock',
      await client.query(
        `INSERT INTO bin_stock (location_id, capacity)
         SELECT location_id, $1 FROM locations WHERE type = 'bin'
         ON CONFLICT (location_id) DO NOTHING`,
        [BIN_CAPACITY],
      ),
    );

    count(
      'rfid_tags',
      await client.query(
        `INSERT INTO rfid_tags (tag_uid)
         SELECT 'TEST-TAG-' || lpad(n::text, 4, '0') FROM generate_series(1, $1) AS n
         ON CONFLICT (tag_uid) DO NOTHING`,
        [TAG_COUNT],
      ),
    );

    count(
      'app_settings',
      await client.query(
        `INSERT INTO app_settings (key, value) VALUES ('expiry_months', '12')
         ON CONFLICT (key) DO NOTHING`,
      ),
    );

    for (const p of ['SAMPLE BLENDING', 'SAMPLE PACKING']) {
      count(
        'process_definitions',
        await client.query(
          'INSERT INTO process_definitions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [p],
        ),
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { password: plainPassword, added };
}

module.exports = { seed, USERS };
