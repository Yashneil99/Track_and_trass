-- 004_rename_staging_to_loading_area.sql
-- Retire the "staging" name. It put a PHASE word in the LOCATION field, so
-- location and status both answered "what phase" and nothing answered "where".
-- After this migration each field does one job:
--   location = where the bag physically sits  -> loading-area / "Loading Area"
--   status   = what phase it is in            -> "Outward Intransit"
--   purpose  = why it moved                   -> "Material Outward In Transit" (UNCHANGED)
--
--   locations.code            staging -> loading-area
--   locations.name            Staging -> Loading Area
--   material_movements.location  staging -> loading-area
--   material_movements.status    Staging -> Outward Intransit
--
-- `purpose` is intentionally NOT touched — nothing filters on it (same reasoning
-- as 002, which left it alone for the deactivation trigger / outward report).
--
-- Same shape as 002: material_movements.location is a FK -> locations(code) with
-- NO ACTION, so drop the FK, rename the master row AND the referencing movement
-- rows, then re-add the FK — all in one transaction. If anything is off it rolls
-- back whole, no partial state.
--
-- NOT idempotent. Only run if 'staging' still exists in public.locations.

BEGIN;

ALTER TABLE public.material_movements
  DROP CONSTRAINT material_movements_location_fkey;

UPDATE public.locations
  SET code = 'loading-area', name = 'Loading Area'
  WHERE code = 'staging';

UPDATE public.material_movements
  SET location = 'loading-area'
  WHERE location = 'staging';

UPDATE public.material_movements
  SET status = 'Outward Intransit'
  WHERE location = 'loading-area' AND status = 'Staging';

ALTER TABLE public.material_movements
  ADD CONSTRAINT material_movements_location_fkey
  FOREIGN KEY (location) REFERENCES public.locations(code);

COMMIT;
