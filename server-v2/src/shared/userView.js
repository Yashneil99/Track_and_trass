/** A users row turned into what the API returns. The password hash never leaves the server. */
function toUserView(row) {
  return {
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

module.exports = { toUserView };
