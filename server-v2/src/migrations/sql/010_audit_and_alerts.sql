-- 010: audit trail and live alerts.

-- Who did what. Capacity changes, expiry edits and merges are recorded here.
CREATE TABLE audit_logs (
  log_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint REFERENCES users (user_id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   text,
  request_id  text,
  ip          text,
  details     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_user_idx ON audit_logs (user_id, created_at);
CREATE INDEX audit_logs_created_brin_idx ON audit_logs USING brin (created_at);

-- Live alerts for admins. Kept in the table so an admin who was offline still sees them.
CREATE TABLE alerts (
  alert_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_type      text        NOT NULL
                  CHECK (alert_type IN ('DAMAGED_BAG', 'EXTRA_BAG', 'UNEXPECTED_BAG', 'REJECTED_TAG',
                                        'LOT_CLOSED_MISSING', 'EXPIRED_BAG', 'NEAR_EXPIRY')),
  severity        text        NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  bag_id          bigint REFERENCES bags (bag_id) ON DELETE SET NULL,
  lot_id          bigint REFERENCES stn_lots (lot_id) ON DELETE SET NULL,
  garden_id       bigint REFERENCES gardens (garden_id) ON DELETE SET NULL,
  message         text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged_by bigint REFERENCES users (user_id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  CHECK ((acknowledged_by IS NULL) OR (acknowledged_at IS NOT NULL))
);
-- The admin's "not yet seen" list.
CREATE INDEX alerts_unacknowledged_idx ON alerts (created_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX alerts_type_idx ON alerts (alert_type, created_at);
CREATE INDEX alerts_bag_idx ON alerts (bag_id) WHERE bag_id IS NOT NULL;
CREATE INDEX alerts_lot_idx ON alerts (lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX alerts_garden_idx ON alerts (garden_id) WHERE garden_id IS NOT NULL;
