-- 003: small settings table and the master list of production processes.

-- Admin-changeable settings, e.g. the expiry period in months.
CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      jsonb       NOT NULL,
  updated_by bigint REFERENCES users (user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The production processes HUL defines. A master list, not a history of bags.
-- (The old dump did not contain this table; the old code needs it.)
CREATE TABLE process_definitions (
  process_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                  text        NOT NULL UNIQUE,
  description           text,
  input_material_types  text[]      NOT NULL DEFAULT '{}',
  output_material_types text[]      NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now()
);
