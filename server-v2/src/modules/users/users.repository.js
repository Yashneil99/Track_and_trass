// SQL only. Each function takes `db`: the pool, or a transaction client.

// strpos instead of LIKE, so a "%" or "_" typed in the search box is just a character.
function filterSql({ role, isActive, q }) {
  const where = [];
  const params = [];
  if (role) where.push(`role = $${params.push(role)}`);
  if (isActive !== undefined) where.push(`is_active = $${params.push(isActive)}`);
  if (q) {
    const n = params.push(q);
    where.push(`(strpos(lower(name), lower($${n})) > 0 OR strpos(lower(email), lower($${n})) > 0)`);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function list(db, filters, { limit, offset }) {
  const { sql, params } = filterSql(filters);
  const [rows, count] = await Promise.all([
    db.query(
      `SELECT * FROM users ${sql} ORDER BY name, user_id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT count(*) AS total FROM users ${sql}`, params),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

/** `lock: true` keeps the row locked until the transaction ends. */
async function findById(db, userId, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM users WHERE user_id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [userId],
  );
  return rows[0];
}

async function insert(db, { email, name, role, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, passwordHash, name, role],
  );
  return rows[0];
}

const COLUMNS = { email: 'email', name: 'name', role: 'role', isActive: 'is_active' };

/** Updates only the fields that are given. Column names come from COLUMNS, never from the caller. */
async function update(db, userId, fields) {
  const sets = [];
  const params = [userId];
  for (const [key, value] of Object.entries(fields)) {
    if (COLUMNS[key] && value !== undefined) sets.push(`${COLUMNS[key]} = $${params.push(value)}`);
  }
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE user_id = $1 RETURNING *`,
    params,
  );
  return rows[0];
}

/**
 * Locks every active admin and returns how many there are. Used before removing an admin:
 * two admins demoting each other at the same moment would otherwise both pass the check.
 */
async function lockActiveAdmins(db) {
  const { rows } = await db.query(
    "SELECT user_id FROM users WHERE role = 'admin' AND is_active ORDER BY user_id FOR UPDATE",
  );
  return rows.map((r) => r.user_id);
}

module.exports = { list, findById, insert, update, lockActiveAdmins };
