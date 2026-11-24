-- 007: one row per physical bag, and the reusable RFID tags.

CREATE TABLE bags (
  bag_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Readable code such as BAG-000101, always derived from bag_id.
  public_code       text GENERATED ALWAYS AS ('BAG-' || lpad(bag_id::text, 6, '0')) STORED UNIQUE,
  lot_id            bigint        NOT NULL REFERENCES stn_lots (lot_id),
  expected_weight_kg numeric(10,3) CHECK (expected_weight_kg >= 0),
  actual_weight_kg   numeric(10,3) CHECK (actual_weight_kg >= 0),
  status            text          NOT NULL DEFAULT 'EXPECTED'
                    CHECK (status IN ('EXPECTED', 'IN_TRANSIT', 'STORED',
                                      'DISPATCHED_TO_PRODUCTION', 'DELIVERED', 'DAMAGED')),
  current_location_id bigint REFERENCES locations (location_id),
  -- Set at STN upload (STN date + the expiry period). Only an admin can change it.
  expiry_date       date          NOT NULL,
  tagged_at                   timestamptz,
  stored_at                   timestamptz,
  dispatched_to_production_at timestamptz,
  delivered_at                timestamptz,
  delivered_process_id        bigint REFERENCES process_definitions (process_id),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  -- A stored bag is always in a bin.
  CHECK (status <> 'STORED' OR current_location_id IS NOT NULL)
);
CREATE INDEX bags_lot_id_idx ON bags (lot_id);
-- Next free slot of a lot; used with FOR UPDATE SKIP LOCKED so scanners never block each other.
CREATE INDEX bags_free_slot_idx ON bags (lot_id, bag_id) WHERE status = 'EXPECTED';
-- What is inside a bin.
CREATE INDEX bags_in_bin_idx ON bags (current_location_id) WHERE status = 'STORED';
-- First-expiry-first-out picking.
CREATE INDEX bags_fefo_idx ON bags (expiry_date) WHERE status = 'STORED';
CREATE INDEX bags_process_idx ON bags (delivered_process_id) WHERE delivered_process_id IS NOT NULL;
CREATE TRIGGER bags_updated_at BEFORE UPDATE ON bags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tags are reused. A tag is on at most one bag at a time (it is a single column),
-- and a bag carries at most one tag (UNIQUE). Past links live in bag_events.
CREATE TABLE rfid_tags (
  tag_uid        text PRIMARY KEY,                  -- the factory number
  status         text        NOT NULL DEFAULT 'AVAILABLE'
                 CHECK (status IN ('AVAILABLE', 'IN_USE', 'LOST', 'DAMAGED')),
  current_bag_id bigint UNIQUE REFERENCES bags (bag_id),
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  -- IN_USE if and only if the tag is on a bag.
  CHECK ((status = 'IN_USE') = (current_bag_id IS NOT NULL))
);
CREATE INDEX rfid_tags_status_idx ON rfid_tags (status);
