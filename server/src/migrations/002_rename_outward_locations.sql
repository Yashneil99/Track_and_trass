-- 002_rename_outward_locations.sql
-- Rename the two outbound-stage location codes to standard warehouse terms:
--   outward-intransit -> staging     (Outward In Transit -> Staging)
--   outward           -> dispatched  (Outward           -> Dispatched)
--
-- material_movements.location is a FK -> locations(code) with NO ACTION, so we
-- drop the FK, rename both the master rows and the referencing movements, then
-- re-add the FK — all in one transaction. Tiny data (a couple of rows).
--
-- NOTE: `purpose` is intentionally NOT renamed. The deactivation trigger and the
-- web outward report both filter on purpose = 'Material Outward', so it stays.

BEGIN;

ALTER TABLE public.material_movements
  DROP CONSTRAINT material_movements_location_fkey;

UPDATE public.locations SET code = 'staging',    name = 'Staging'    WHERE code = 'outward-intransit';
UPDATE public.locations SET code = 'dispatched', name = 'Dispatched' WHERE code = 'outward';

UPDATE public.material_movements SET location = 'staging'    WHERE location = 'outward-intransit';
UPDATE public.material_movements SET location = 'dispatched' WHERE location = 'outward';

ALTER TABLE public.material_movements
  ADD CONSTRAINT material_movements_location_fkey
  FOREIGN KEY (location) REFERENCES public.locations(code);

COMMIT;
