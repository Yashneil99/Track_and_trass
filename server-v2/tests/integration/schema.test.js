// Tries to break every rule the database is supposed to enforce by itself.
// If code later has a bug, these rules are the last line of defence.
const { getPool, closePool } = require('../../src/config/db');
const { resetDatabase, errorOf } = require('../helpers/testDb');

const q = (text, params) => getPool().query(text, params);
const one = async (text, params) => (await q(text, params)).rows[0];

// Postgres error codes
const UNIQUE = '23505';
const FOREIGN_KEY = '23503';
const CHECK = '23514';
const GENERATED_COLUMN = '428C9';

let seq = 0;
const next = () => ++seq;

const makeUser = async (role = 'operator') =>
  (
    await one(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, 'x', 'T', $2) RETURNING *`,
      [`user${next()}@example.test`, role],
    )
  ).user_id;

async function makeStn() {
  const uploader = await makeUser('admin');
  return (
    await one(
      `INSERT INTO stn_documents (stn_number, stn_date, file_hash, uploaded_by)
       VALUES ($1, '2026-01-01', $2, $3) RETURNING stn_id`,
      [`STN${next()}`, `hash${next()}`, uploader],
    )
  ).stn_id;
}

const makeGarden = async (name = `GARDEN ${next()}`) =>
  (await one('INSERT INTO gardens (name) VALUES ($1) RETURNING garden_id', [name])).garden_id;

async function makeLot({ expected = 10, gardenId, invoice } = {}) {
  const stnId = await makeStn();
  const garden = gardenId || (await makeGarden());
  return (
    await one(
      `INSERT INTO stn_lots (stn_id, garden_id, invoice_no, bags_expected)
       VALUES ($1, $2, $3, $4) RETURNING lot_id`,
      [stnId, garden, invoice || `INV${next()}`, expected],
    )
  ).lot_id;
}

async function makeBin(capacity = 10) {
  const loc = await one(
    `INSERT INTO locations (code, name, type) VALUES ($1, 'Bin', 'bin') RETURNING location_id`,
    [`bin_${next()}`],
  );
  await q('INSERT INTO bin_stock (location_id, capacity) VALUES ($1, $2)', [
    loc.location_id,
    capacity,
  ]);
  return loc.location_id;
}

async function makeBag(lotId, { status = 'EXPECTED', locationId = null } = {}) {
  return (
    await one(
      `INSERT INTO bags (lot_id, status, current_location_id, expiry_date)
       VALUES ($1, $2, $3, '2027-01-01') RETURNING *`,
      [lotId, status, locationId],
    )
  ).bag_id;
}

beforeAll(() => resetDatabase());
afterAll(closePool);

describe('users', () => {
  test('email is unique regardless of upper/lower case', async () => {
    await q(
      `INSERT INTO users (email, password_hash, name, role) VALUES ('Ram@x.test','x','R','admin')`,
    );
    const err = await errorOf(
      q(
        `INSERT INTO users (email, password_hash, name, role) VALUES ('ram@X.TEST','x','R','admin')`,
      ),
    );
    expect(err.code).toBe(UNIQUE);
  });

  test('only the known roles are allowed', async () => {
    const err = await errorOf(
      q(
        `INSERT INTO users (email, password_hash, name, role) VALUES ('r@x.test','x','R','supervisor')`,
      ),
    );
    expect(err.code).toBe(CHECK);
  });
});

describe('bins (locations + bin_stock)', () => {
  test('available is worked out by Postgres: capacity - occupied - reserved', async () => {
    const id = await makeBin(100);
    await q('UPDATE bin_stock SET occupied = 30, reserved = 20 WHERE location_id = $1', [id]);
    expect(
      (await one('SELECT available FROM bin_stock WHERE location_id = $1', [id])).available,
    ).toBe(50);
  });

  test('nobody can set available directly', async () => {
    const id = await makeBin(100);
    const err = await errorOf(q('UPDATE bin_stock SET available = 5 WHERE location_id = $1', [id]));
    expect(err.code).toBe(GENERATED_COLUMN);
  });

  test('a bin can never be over-booked', async () => {
    const id = await makeBin(10);
    await q('UPDATE bin_stock SET occupied = 6, reserved = 4 WHERE location_id = $1', [id]);
    const err = await errorOf(q('UPDATE bin_stock SET reserved = 5 WHERE location_id = $1', [id]));
    expect(err.code).toBe(CHECK);
  });

  test('capacity cannot drop below what is occupied + reserved', async () => {
    const id = await makeBin(10);
    await q('UPDATE bin_stock SET occupied = 6, reserved = 2 WHERE location_id = $1', [id]);
    const err = await errorOf(q('UPDATE bin_stock SET capacity = 7 WHERE location_id = $1', [id]));
    expect(err.code).toBe(CHECK);
    await q('UPDATE bin_stock SET capacity = 8 WHERE location_id = $1', [id]); // exactly full is fine
  });

  test('occupied and reserved cannot go negative', async () => {
    const id = await makeBin(10);
    const err = await errorOf(q('UPDATE bin_stock SET occupied = -1 WHERE location_id = $1', [id]));
    expect(err.code).toBe(CHECK);
  });

  test('only bins hold stock, not floors or warehouses', async () => {
    const floor = await one(
      `INSERT INTO locations (code, name, type) VALUES ('floor_x', 'F', 'floor') RETURNING location_id`,
    );
    const err = await errorOf(
      q('INSERT INTO bin_stock (location_id, capacity) VALUES ($1, 10)', [floor.location_id]),
    );
    expect(err.code).toBe(CHECK);
  });

  test('a location cannot be its own parent, and parents must exist', async () => {
    const loc = await one(
      `INSERT INTO locations (code, name, type) VALUES ('self_x', 'S', 'floor') RETURNING location_id`,
    );
    expect(
      (
        await errorOf(
          q('UPDATE locations SET parent_id = location_id WHERE location_id = $1', [
            loc.location_id,
          ]),
        )
      ).code,
    ).toBe(CHECK);
    expect(
      (
        await errorOf(
          q(
            `INSERT INTO locations (code, name, type, parent_id) VALUES ('orphan', 'O', 'bin', 999999)`,
          ),
        )
      ).code,
    ).toBe(FOREIGN_KEY);
  });
});

describe('gardens', () => {
  test('names must be normalized: upper case, trimmed, single spaces', async () => {
    for (const bad of ['ngk gold', ' NGK GOLD', 'NGK GOLD ', 'NGK  GOLD', '']) {
      const err = await errorOf(makeGarden(bad));
      expect(err && err.code).toBe(CHECK);
    }
  });

  test('the same garden cannot exist twice', async () => {
    await makeGarden('DUPLICATE TEST GARDEN');
    expect((await errorOf(makeGarden('DUPLICATE TEST GARDEN'))).code).toBe(UNIQUE);
  });

  test('a garden is merged if and only if it points at its target', async () => {
    const target = await makeGarden();
    const source = await makeGarden();
    const noTarget = await errorOf(
      q(`UPDATE gardens SET status = 'merged' WHERE garden_id = $1`, [source]),
    );
    expect(noTarget.code).toBe(CHECK);
    const noStatus = await errorOf(
      q('UPDATE gardens SET merged_into_garden_id = $1 WHERE garden_id = $2', [target, source]),
    );
    expect(noStatus.code).toBe(CHECK);
    await q(
      `UPDATE gardens SET status = 'merged', merged_into_garden_id = $1 WHERE garden_id = $2`,
      [target, source],
    );
  });

  test('a garden cannot be merged into itself', async () => {
    const id = await makeGarden();
    const err = await errorOf(
      q(
        `UPDATE gardens SET status = 'merged', merged_into_garden_id = garden_id WHERE garden_id = $1`,
        [id],
      ),
    );
    expect(err.code).toBe(CHECK);
  });

  test('an alias text can belong to only one garden', async () => {
    const a = await makeGarden();
    const b = await makeGarden();
    await q(`INSERT INTO garden_aliases (garden_id, alias_text) VALUES ($1, 'SHARED NAME')`, [a]);
    const err = await errorOf(
      q(`INSERT INTO garden_aliases (garden_id, alias_text) VALUES ($1, 'SHARED NAME')`, [b]),
    );
    expect(err.code).toBe(UNIQUE);
  });
});

describe('lots', () => {
  test('the same invoice number cannot repeat for one garden, but can for another', async () => {
    const g1 = await makeGarden();
    const g2 = await makeGarden();
    await makeLot({ gardenId: g1, invoice: 'INV-SAME' });
    expect((await errorOf(makeLot({ gardenId: g1, invoice: 'INV-SAME' }))).code).toBe(UNIQUE);
    await makeLot({ gardenId: g2, invoice: 'INV-SAME' });
  });

  test('a lot must expect at least one bag', async () => {
    expect((await errorOf(makeLot({ expected: 0 }))).code).toBe(CHECK);
  });

  test('counters cannot run ahead of the step before them', async () => {
    const lot = await makeLot({ expected: 10 });
    const bad = [
      'bags_tagged = 11', // more tagged than expected
      'bags_stored = 1', // stored but never tagged
      'bags_tagged = 5, bags_stored = 6',
      'bags_tagged = 5, bags_stored = 5, bags_dispatched = 6',
      'bags_tagged = 5, bags_stored = 5, bags_dispatched = 5, bags_delivered = 6',
      'bags_damaged = 1', // damaged but never tagged
    ];
    for (const set of bad) {
      const err = await errorOf(q(`UPDATE stn_lots SET ${set} WHERE lot_id = $1`, [lot]));
      expect({ set, code: err && err.code }).toEqual({ set, code: CHECK });
    }
    await q(
      `UPDATE stn_lots SET bags_tagged = 8, bags_stored = 6, bags_dispatched = 3, bags_delivered = 2,
       bags_damaged = 1 WHERE lot_id = $1`,
      [lot],
    );
  });

  test('only the six lot statuses are allowed', async () => {
    const lot = await makeLot();
    expect(
      (await errorOf(q(`UPDATE stn_lots SET status = 'DONE' WHERE lot_id = $1`, [lot]))).code,
    ).toBe(CHECK);
    for (const s of [
      'IN_TRANSIT',
      'PARTIALLY_STORED',
      'STORED',
      'PARTIALLY_DISPATCHED',
      'DISPATCHED',
    ]) {
      await q('UPDATE stn_lots SET status = $1 WHERE lot_id = $2', [s, lot]);
    }
  });

  test('a lot split over several bins, but never the same bin twice', async () => {
    const lot = await makeLot();
    const binA = await makeBin();
    const binB = await makeBin();
    await q(
      'INSERT INTO lot_bin_allocations (lot_id, location_id, bags_allocated) VALUES ($1, $2, 6)',
      [lot, binA],
    );
    await q(
      'INSERT INTO lot_bin_allocations (lot_id, location_id, bags_allocated) VALUES ($1, $2, 4)',
      [lot, binB],
    );
    expect(
      (
        await errorOf(
          q(
            'INSERT INTO lot_bin_allocations (lot_id, location_id, bags_allocated) VALUES ($1, $2, 1)',
            [lot, binA],
          ),
        )
      ).code,
    ).toBe(UNIQUE);
    expect(
      (
        await errorOf(
          q(
            'INSERT INTO lot_bin_allocations (lot_id, location_id, bags_allocated) VALUES ($1, $2, 0)',
            [lot, await makeBin()],
          ),
        )
      ).code,
    ).toBe(CHECK);
  });
});

describe('bags', () => {
  test('the readable code is derived from the id and cannot be set by hand', async () => {
    const lot = await makeLot();
    const bag = await one(
      `INSERT INTO bags (lot_id, expiry_date) VALUES ($1, '2027-01-01') RETURNING *`,
      [lot],
    );
    expect(bag.public_code).toBe(`BAG-${String(bag.bag_id).padStart(6, '0')}`);
    const err = await errorOf(
      q(`INSERT INTO bags (lot_id, expiry_date, public_code) VALUES ($1, '2027-01-01', 'BAG-X')`, [
        lot,
      ]),
    );
    expect(err.code).toBe(GENERATED_COLUMN);
  });

  test('a stored bag must be in a bin', async () => {
    const lot = await makeLot();
    expect((await errorOf(makeBag(lot, { status: 'STORED' }))).code).toBe(CHECK);
    await makeBag(lot, { status: 'STORED', locationId: await makeBin() });
  });

  test('only the six bag statuses are allowed', async () => {
    const lot = await makeLot();
    expect((await errorOf(makeBag(lot, { status: 'LOST' }))).code).toBe(CHECK);
  });

  test('every bag needs an expiry date and a lot', async () => {
    const lot = await makeLot();
    expect((await errorOf(q('INSERT INTO bags (lot_id) VALUES ($1)', [lot]))).code).toBe('23502');
    expect(
      (await errorOf(q(`INSERT INTO bags (lot_id, expiry_date) VALUES (999999, '2027-01-01')`)))
        .code,
    ).toBe(FOREIGN_KEY);
  });
});

describe('rfid tags', () => {
  const makeTag = (uid) => q('INSERT INTO rfid_tags (tag_uid) VALUES ($1)', [uid]);
  const attach = (uid, bag) =>
    q(`UPDATE rfid_tags SET status = 'IN_USE', current_bag_id = $2 WHERE tag_uid = $1`, [uid, bag]);

  test('a tag is on at most one bag, and a bag carries at most one tag', async () => {
    const lot = await makeLot();
    const bag1 = await makeBag(lot);
    const bag2 = await makeBag(lot);
    await makeTag('T-A');
    await makeTag('T-B');
    await attach('T-A', bag1);
    expect((await errorOf(attach('T-B', bag1))).code).toBe(UNIQUE); // second tag on the same bag
    await attach('T-B', bag2); // a different bag is fine
  });

  test('a released tag can be reused on another bag', async () => {
    const lot = await makeLot();
    const bag1 = await makeBag(lot);
    const bag2 = await makeBag(lot);
    await makeTag('T-REUSE');
    await attach('T-REUSE', bag1);
    await q(
      `UPDATE rfid_tags SET status = 'AVAILABLE', current_bag_id = NULL WHERE tag_uid = 'T-REUSE'`,
    );
    await attach('T-REUSE', bag2);
    expect(
      (await one(`SELECT current_bag_id FROM rfid_tags WHERE tag_uid = 'T-REUSE'`)).current_bag_id,
    ).toBe(bag2);
  });

  test('IN_USE and "has a bag" always agree', async () => {
    const lot = await makeLot();
    const bag = await makeBag(lot);
    await makeTag('T-C');
    const inUseNoBag = await errorOf(
      q(`UPDATE rfid_tags SET status = 'IN_USE' WHERE tag_uid = 'T-C'`),
    );
    expect(inUseNoBag.code).toBe(CHECK);
    const bagButAvailable = await errorOf(
      q(`UPDATE rfid_tags SET current_bag_id = $1 WHERE tag_uid = 'T-C'`, [bag]),
    );
    expect(bagButAvailable.code).toBe(CHECK);
  });
});

describe('bag_events (monthly partitions)', () => {
  test('an event lands in its own month, and old dates fall into the default partition', async () => {
    const lot = await makeLot();
    const bag = await makeBag(lot);

    await q(`INSERT INTO bag_events (bag_id, event_type) VALUES ($1, 'CREATED')`, [bag]);
    const now = await one(
      `SELECT tableoid::regclass::text AS part FROM bag_events WHERE bag_id = $1`,
      [bag],
    );
    const month = await one(`SELECT to_char(now(), 'YYYY_MM') AS m`);
    expect(now.part).toBe(`bag_events_${month.m}`);

    await q(
      `INSERT INTO bag_events (bag_id, event_type, occurred_at) VALUES ($1, 'STORED', '2019-05-05')`,
      [bag],
    );
    const old = await one(
      `SELECT tableoid::regclass::text AS part FROM bag_events WHERE occurred_at < '2020-01-01'`,
    );
    expect(old.part).toBe('bag_events_default');
  });

  test('event ids keep increasing across partitions', async () => {
    const lot = await makeLot();
    const bag = await makeBag(lot);
    const a = await one(
      `INSERT INTO bag_events (bag_id, event_type) VALUES ($1, 'CREATED') RETURNING event_id`,
      [bag],
    );
    const b = await one(
      `INSERT INTO bag_events (bag_id, event_type, occurred_at) VALUES ($1, 'STORED', '2019-01-01') RETURNING event_id`,
      [bag],
    );
    expect(Number(b.event_id)).toBeGreaterThan(Number(a.event_id));
  });

  test('an event needs a real bag and a known type', async () => {
    const lot = await makeLot();
    const bag = await makeBag(lot);
    expect(
      (await errorOf(q(`INSERT INTO bag_events (bag_id, event_type) VALUES (999999, 'CREATED')`)))
        .code,
    ).toBe(FOREIGN_KEY);
    expect(
      (
        await errorOf(
          q(`INSERT INTO bag_events (bag_id, event_type) VALUES ($1, 'TELEPORTED')`, [bag]),
        )
      ).code,
    ).toBe(CHECK);
  });

  test('ensure_bag_events_partition is safe to call again', async () => {
    const first = await one(`SELECT ensure_bag_events_partition('2031-03-15') AS name`);
    const again = await one(`SELECT ensure_bag_events_partition('2031-03-20') AS name`);
    expect(first.name).toBe('bag_events_2031_03');
    expect(again.name).toBe('bag_events_2031_03');
  });
});

describe('outward requests', () => {
  async function makeRequest(locationId, status = 'PENDING') {
    const user = await makeUser();
    return (
      await one(
        `INSERT INTO outward_requests (location_id, requested_by, status) VALUES ($1, $2, $3) RETURNING request_id`,
        [locationId, user, status],
      )
    ).request_id;
  }
  const makeLine = async (requestId, requested = 5) =>
    (
      await one(
        `INSERT INTO outward_request_lines (request_id, garden_id, bags_requested)
         VALUES ($1, $2, $3) RETURNING line_id`,
        [requestId, await makeGarden(), requested],
      )
    ).line_id;

  test('only one pending request per location', async () => {
    const loc = await one(
      `INSERT INTO locations (code, name, type) VALUES ('prod_x', 'P', 'loading_area') RETURNING location_id`,
    );
    const first = await makeRequest(loc.location_id);
    expect((await errorOf(makeRequest(loc.location_id))).code).toBe(UNIQUE);

    await q(`UPDATE outward_requests SET status = 'COMPLETED' WHERE request_id = $1`, [first]);
    await makeRequest(loc.location_id); // allowed once the first one is finished
  });

  test('cannot pick more bags than were requested', async () => {
    const loc = await one(
      `INSERT INTO locations (code, name, type) VALUES ('prod_y', 'P', 'loading_area') RETURNING location_id`,
    );
    const line = await makeLine(await makeRequest(loc.location_id), 5);
    expect(
      (
        await errorOf(
          q('UPDATE outward_request_lines SET bags_picked = 6 WHERE line_id = $1', [line]),
        )
      ).code,
    ).toBe(CHECK);
  });

  test('a picked bag must belong to a line of the same request', async () => {
    const locA = await one(
      `INSERT INTO locations (code, name, type) VALUES ('prod_a', 'P', 'loading_area') RETURNING location_id`,
    );
    const locB = await one(
      `INSERT INTO locations (code, name, type) VALUES ('prod_b', 'P', 'loading_area') RETURNING location_id`,
    );
    const requestA = await makeRequest(locA.location_id);
    const requestB = await makeRequest(locB.location_id);
    const lineOfB = await makeLine(requestB);
    const bag = await makeBag(await makeLot());
    const picker = await makeUser();

    const wrong = await errorOf(
      q(
        'INSERT INTO outward_request_bags (request_id, line_id, bag_id, picked_by) VALUES ($1, $2, $3, $4)',
        [requestA, lineOfB, bag, picker],
      ),
    );
    expect(wrong.code).toBe(FOREIGN_KEY);
    await q(
      'INSERT INTO outward_request_bags (request_id, line_id, bag_id, picked_by) VALUES ($1, $2, $3, $4)',
      [requestB, lineOfB, bag, picker],
    );
  });

  test('a bag can leave only once', async () => {
    const locA = await one(
      `INSERT INTO locations (code, name, type) VALUES ('prod_c', 'P', 'loading_area') RETURNING location_id`,
    );
    const locB = await one(
      `INSERT INTO locations (code, name, type) VALUES ('prod_d', 'P', 'loading_area') RETURNING location_id`,
    );
    const requestA = await makeRequest(locA.location_id);
    const requestB = await makeRequest(locB.location_id);
    const lineA = await makeLine(requestA);
    const lineB = await makeLine(requestB);
    const bag = await makeBag(await makeLot());
    const picker = await makeUser();
    const insert = (r, l) =>
      q(
        'INSERT INTO outward_request_bags (request_id, line_id, bag_id, picked_by) VALUES ($1, $2, $3, $4)',
        [r, l, bag, picker],
      );

    await insert(requestA, lineA);
    expect((await errorOf(insert(requestB, lineB))).code).toBe(UNIQUE);
  });
});

describe('alerts and settings', () => {
  test('only known alert types and severities are allowed', async () => {
    expect(
      (await errorOf(q(`INSERT INTO alerts (alert_type, message) VALUES ('FIRE', 'x')`))).code,
    ).toBe(CHECK);
    expect(
      (
        await errorOf(
          q(
            `INSERT INTO alerts (alert_type, severity, message) VALUES ('DAMAGED_BAG', 'PANIC', 'x')`,
          ),
        )
      ).code,
    ).toBe(CHECK);
    await q(`INSERT INTO alerts (alert_type, message) VALUES ('DAMAGED_BAG', 'a bag was damaged')`);
  });

  test('updated_at moves forward automatically', async () => {
    await q(`INSERT INTO app_settings (key, value) VALUES ('t_key', '1')`);
    const before = await one(`SELECT updated_at FROM app_settings WHERE key = 't_key'`);
    await q('SELECT pg_sleep(0.05)');
    await q(`UPDATE app_settings SET value = '2' WHERE key = 't_key'`);
    const after = await one(`SELECT updated_at FROM app_settings WHERE key = 't_key'`);
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
  });
});

describe('migration 011: login lockout and process names', () => {
  test('a new user starts with no failed attempts, no lock and no last login', async () => {
    const user = await one(
      `INSERT INTO users (email, password_hash, name, role) VALUES ('m11@x.test', 'h', 'M', 'admin')
       RETURNING failed_login_attempts, locked_until, last_login_at`,
    );
    expect(user).toEqual({ failed_login_attempts: 0, locked_until: null, last_login_at: null });
  });

  test('failed attempts can never be negative', async () => {
    const err = await errorOf(q('UPDATE users SET failed_login_attempts = -1'));
    expect(err.code).toBe('23514');
  });

  test('"Blending" and "BLENDING" cannot both be processes', async () => {
    await q("INSERT INTO process_definitions (name) VALUES ('Blending')");
    const err = await errorOf(q("INSERT INTO process_definitions (name) VALUES ('BLENDING')"));
    expect(err.code).toBe('23505');
  });
});
