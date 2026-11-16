-- Schema fix. Run once:
--   docker compose exec -T postgres psql -U postgres -d hul_track < server/src/migrations/006_fix_timetz_columns.sql
--
-- raise_request.created_at and material_movements.reached_at were declared
-- `time with time zone` — a clock reading, no date. Both are written with NOW(),
-- which is a timestamptz, so Postgres silently truncated the date away on every
-- insert. Nothing errored; the date just never existed.
--
-- The live damage is raiseRequestDL.getPendingRaiseRequests, which orders by
-- created_at for FIFO. Across midnight that inverts: yesterday's 23:00 request
-- sorts behind this morning's 09:00 one, so the oldest request is served last
-- exactly when the queue has a backlog worth ordering.
--
-- Backfill is best-effort — a discarded date is not recoverable, only guessable:
--   reached_at: date taken from the row's own moved_at (timestamptz, intact).
--               A movement that reached the next day gets bumped a day so it
--               cannot land before its own departure.
--   created_at: no sibling timestamp exists on raise_request. Dated CURRENT_DATE,
--               which is right only for rows raised today. Verify the count is
--               small before running.

BEGIN;

ALTER TABLE public.raise_request
    ALTER COLUMN created_at DROP DEFAULT,
    ALTER COLUMN created_at TYPE timestamptz USING CURRENT_DATE + created_at,
    ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.material_movements
    ALTER COLUMN reached_at TYPE timestamptz
    USING CASE
        WHEN reached_at IS NULL THEN NULL
        WHEN moved_at::date + reached_at < moved_at
            THEN moved_at::date + reached_at + interval '1 day'
        ELSE moved_at::date + reached_at
    END;

COMMIT;
