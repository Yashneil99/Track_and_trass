/** Who is doing this request: saved with every audit row. Not logged in (register) gives no user id. */
function actorOf(req) {
  return { userId: req.user ? Number(req.user.userId) : null, requestId: req.id, ip: req.ip };
}

/**
 * Write one row to the audit trail. Pass the transaction's `client` so the record is
 * saved or rolled back together with the change it describes.
 */
async function writeAudit(db, actor, { action, entityType, entityId, details = {} }) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, request_id, ip, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actor.userId ?? null,
      action,
      entityType,
      entityId === undefined || entityId === null ? null : String(entityId),
      actor.requestId ?? null,
      actor.ip ?? null,
      JSON.stringify(details),
    ],
  );
}

module.exports = { actorOf, writeAudit };
