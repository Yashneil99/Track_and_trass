-- 002: the warehouse tree and the numbers for each bin.

-- warehouse -> floor -> bin, plus the loading area.
CREATE TABLE locations (
  location_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        text        NOT NULL UNIQUE,   -- readable, e.g. hul_2f_bin_3
  name        text        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('warehouse', 'floor', 'bin', 'loading_area')),
  parent_id   bigint REFERENCES locations (location_id) ON DELETE RESTRICT,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> location_id)
);
CREATE INDEX locations_parent_id_idx ON locations (parent_id);
CREATE INDEX locations_type_active_idx ON locations (type, is_active);

-- One row per bin with all four numbers together.
--   capacity  : changed only when an admin edits the bin
--   occupied  : bags physically inside
--   reserved  : space promised to lots that have not arrived yet
--   available : worked out by Postgres, nobody can set it
-- The CHECK is the safety net: a bin can never be over-booked, even if code is wrong.
CREATE TABLE bin_stock (
  location_id bigint PRIMARY KEY REFERENCES locations (location_id) ON DELETE CASCADE,
  capacity    integer     NOT NULL CHECK (capacity >= 0),
  occupied    integer     NOT NULL DEFAULT 0 CHECK (occupied >= 0),
  reserved    integer     NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available   integer GENERATED ALWAYS AS (capacity - occupied - reserved) STORED,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (occupied + reserved <= capacity)
);
CREATE TRIGGER bin_stock_updated_at BEFORE UPDATE ON bin_stock
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Only bins hold stock. Floors and warehouses are summed from their bins.
CREATE FUNCTION bin_stock_only_for_bins() RETURNS trigger AS $$
BEGIN
  IF (SELECT type FROM locations WHERE location_id = NEW.location_id) <> 'bin' THEN
    RAISE EXCEPTION 'bin_stock rows are only allowed for locations of type bin'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER bin_stock_only_bins BEFORE INSERT ON bin_stock
  FOR EACH ROW EXECUTE FUNCTION bin_stock_only_for_bins();
