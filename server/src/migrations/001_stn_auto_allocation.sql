-- Task 1: Auto Allocation of Bags on STN Upload
-- Run manually against hul_track before deploying this feature:
--   docker compose exec -T postgres psql -U postgres -d hul_track < server/src/migrations/001_stn_auto_allocation.sql

-- 1. Bins need a place to hold "reserved but not yet occupied" capacity.
--    capacity (attributes->>'capacity') - occupied (from material_movements) - reserved = available
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS reserved integer NOT NULL DEFAULT 0;

-- 2. Consolidated STN rows. One row per Garden Invoice per STN (dedup target).
--    This is what the "Assign Location" / "Release Location" buttons operate on,
--    and what the Android inward flow increments via bags_submitted.
CREATE TABLE IF NOT EXISTS public.stn_invoice_allocations (
    allocation_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_stn       text NOT NULL,
    garden_invoice    text NOT NULL,
    garden_name       text,
    grade             text,
    net_weight        numeric,
    total_bags        integer NOT NULL CHECK (total_bags > 0),
    allocated_location text,
    bags_submitted    integer NOT NULL DEFAULT 0,
    row_order         integer NOT NULL DEFAULT 0,
    created_at        timestamp with time zone DEFAULT now(),
    updated_at        timestamp with time zone DEFAULT now(),
    UNIQUE (invoice_stn, garden_invoice)
);

CREATE INDEX IF NOT EXISTS idx_stn_invoice_allocations_invoice_stn
  ON public.stn_invoice_allocations (invoice_stn);
