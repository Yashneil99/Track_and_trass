-- 008: the history of everything that happens to a bag. Append-only, one table per month.
-- Current state lives on bags; this table is the timeline.

CREATE SEQUENCE bag_events_event_id_seq;

CREATE TABLE bag_events (
  event_id         bigint      NOT NULL DEFAULT nextval('bag_events_event_id_seq'),
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  bag_id           bigint      NOT NULL REFERENCES bags (bag_id),
  event_type       text        NOT NULL
                   CHECK (event_type IN ('CREATED', 'TAGGED', 'STORED', 'MOVED',
                                         'DISPATCHED_TO_PRODUCTION', 'DELIVERED', 'DAMAGED',
                                         'TAG_RELEASED', 'EXPIRY_CHANGED')),
  from_status      text,
  to_status        text,
  tag_uid          text REFERENCES rfid_tags (tag_uid),   -- which tag, so reuse history is kept
  user_id          bigint REFERENCES users (user_id),
  from_location_id bigint REFERENCES locations (location_id),
  to_location_id   bigint REFERENCES locations (location_id),
  device_id        text,
  payload          jsonb       NOT NULL DEFAULT '{}',     -- OCR text, expiry-change reason, ...
  PRIMARY KEY (event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);
ALTER SEQUENCE bag_events_event_id_seq OWNED BY bag_events.event_id;

CREATE INDEX bag_events_bag_timeline_idx ON bag_events (bag_id, occurred_at DESC);
CREATE INDEX bag_events_occurred_brin_idx ON bag_events USING brin (occurred_at);
CREATE INDEX bag_events_tag_idx ON bag_events (tag_uid) WHERE tag_uid IS NOT NULL;
CREATE INDEX bag_events_user_idx ON bag_events (user_id) WHERE user_id IS NOT NULL;

-- Catches anything outside the monthly partitions so an insert never fails.
CREATE TABLE bag_events_default PARTITION OF bag_events DEFAULT;

-- Creates the partition for the month containing p_month if it is missing.
-- Called here, and nightly later by a background job to stay ahead.
CREATE FUNCTION ensure_bag_events_partition(p_month date) RETURNS text AS $$
DECLARE
  start_date date := date_trunc('month', p_month)::date;
  end_date   date := (date_trunc('month', p_month) + interval '1 month')::date;
  part_name  text := 'bag_events_' || to_char(start_date, 'YYYY_MM');
BEGIN
  IF to_regclass(part_name) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF bag_events FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date);
  END IF;
  RETURN part_name;
END;
$$ LANGUAGE plpgsql;

-- Current month plus the next 12.
SELECT ensure_bag_events_partition((date_trunc('month', now()) + make_interval(months => m))::date)
FROM generate_series(0, 12) AS m;
