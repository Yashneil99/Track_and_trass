-- Task 2: Split allocation across multiple bins when no single bin has
-- enough space, but the leftover space across several bins together does.
-- Run manually against hul_track before deploying this feature:
--   docker compose exec -T postgres psql -U postgres -d hul_track < server/src/migrations/002_stn_split_allocation.sql

-- One row per (allocation, bin) a garden invoice's bags were split across.
-- When a garden invoice fits in a single bin, this table stays empty and
-- stn_invoice_allocations.allocated_location holds the bin code as before.
-- When it had to be split, stn_invoice_allocations.allocated_location is
-- set to the literal 'SPLIT' and the per-bin breakdown lives here.
CREATE TABLE IF NOT EXISTS public.stn_invoice_allocation_splits (
    split_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id   uuid NOT NULL REFERENCES public.stn_invoice_allocations(allocation_id) ON DELETE CASCADE,
    location_code   text NOT NULL,
    bags            integer NOT NULL CHECK (bags > 0),
    bags_submitted  integer NOT NULL DEFAULT 0,
    created_at      timestamp with time zone DEFAULT now(),
    updated_at      timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stn_invoice_allocation_splits_allocation_id
  ON public.stn_invoice_allocation_splits (allocation_id);

CREATE INDEX IF NOT EXISTS idx_stn_invoice_allocation_splits_location_code
  ON public.stn_invoice_allocation_splits (location_code);
