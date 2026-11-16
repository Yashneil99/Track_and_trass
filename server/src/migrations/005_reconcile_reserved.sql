-- One-time repair, not a schema change. Run once after deploying the STN delete
-- guard (stnDL.deleteStnDocument):
--   docker compose exec -T postgres psql -U postgres -d hul_track < server/src/migrations/005_reconcile_reserved.sql
--
-- Every STN deleted before that guard existed deleted only its document row. The
-- consolidated rows stayed behind, still pointing at their bins, still holding
-- locations.reserved — capacity promised to bags that are never coming, with the
-- Release Bin button (rendered per document) gone along with the document.
--
-- So the damage is NOT a reserved counter that disagrees with the allocation
-- rows: the ghost rows agree with it perfectly. The damage is allocation rows
-- that outlived their STN. Those are the ones to find, and they are only
-- findable as rows whose invoice_stn no longer appears in documents.
--
-- Safe to re-run. Once the guard is in place a re-run should report nothing —
-- if it doesn't, something is still leaking and that is a bug to find, not a
-- number to paper over on a schedule.

BEGIN;

-- 1. Ghost STNs that never received a bag: the STN is gone, nothing arrived,
--    the reservation is pure garbage. Report them before deleting so the run
--    leaves a record of what it freed.
SELECT
    a.invoice_stn,
    a.garden_invoice,
    a.allocated_location,
    a.total_bags AS reservation_freed
FROM public.stn_invoice_allocations a
WHERE a.bags_submitted = 0
  AND NOT EXISTS (
      SELECT 1 FROM public.documents d WHERE d.invoice_stn = a.invoice_stn
  )
ORDER BY a.invoice_stn, a.garden_invoice;

-- Splits cascade off allocation_id (003_stn_split_allocation.sql).
DELETE FROM public.stn_invoice_allocations a
WHERE a.bags_submitted = 0
  AND NOT EXISTS (
      SELECT 1 FROM public.documents d WHERE d.invoice_stn = a.invoice_stn
  );

-- 2. Ghost STNs that DID receive bags. These are not garbage — the bags are
--    physically in the bin and these rows are the only thing explaining why.
--    Their outstanding bags stay reserved and no UI can release them, because
--    the STN they belong to no longer exists. Needs a human: re-upload the STN
--    to get its Release Bin button back, or accept the bags as final.
--    Reported, never auto-deleted.
SELECT
    a.invoice_stn,
    a.garden_invoice,
    a.allocated_location,
    a.bags_submitted,
    a.total_bags,
    a.total_bags - a.bags_submitted AS still_reserved_unreleasable
FROM public.stn_invoice_allocations a
WHERE a.bags_submitted > 0
  AND NOT EXISTS (
      SELECT 1 FROM public.documents d WHERE d.invoice_stn = a.invoice_stn
  )
ORDER BY still_reserved_unreleasable DESC;

-- 3. Recompute reserved from whatever survived step 1. A bin's true reservation
--    is the bags of every invoice allocated to it that have not been inwarded
--    yet. A split invoice's per-bin breakdown lives in the splits table and its
--    parent row carries the literal 'SPLIT' instead of a bin code, so the two
--    shapes are summed separately and added per bin. Bins with no live
--    allocation reserve nothing, hence the COALESCE to 0 — an inner join here
--    would silently skip the very bins a ghost STN had over-reserved.
WITH true_reserved AS (
    SELECT code, SUM(reserved)::int AS reserved
    FROM (
        SELECT allocated_location AS code,
               SUM(total_bags - bags_submitted)::int AS reserved
        FROM public.stn_invoice_allocations
        WHERE allocated_location IS NOT NULL
          AND allocated_location <> 'SPLIT'
        GROUP BY allocated_location
        UNION ALL
        SELECT location_code AS code,
               SUM(bags - bags_submitted)::int AS reserved
        FROM public.stn_invoice_allocation_splits
        GROUP BY location_code
    ) per_shape
    GROUP BY code
)
UPDATE public.locations l
SET reserved = GREATEST(0, COALESCE(
        (SELECT t.reserved FROM true_reserved t WHERE t.code = l.code), 0))
WHERE l.type = 'bin'
  AND l.reserved <> GREATEST(0, COALESCE(
        (SELECT t.reserved FROM true_reserved t WHERE t.code = l.code), 0));

COMMIT;
