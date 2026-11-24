-- 006: lots (one garden invoice inside an STN), their Excel lines and bin plan.

CREATE TABLE stn_lots (
  lot_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stn_id          bigint      NOT NULL REFERENCES stn_documents (stn_id),
  garden_id       bigint      NOT NULL REFERENCES gardens (garden_id),
  grade           text,
  invoice_no      text        NOT NULL,
  lot_qr_code     text UNIQUE,                 -- fallback when OCR cannot read the bag

  -- Progress counters. The server updates them in the same transaction as each bag change.
  bags_expected   integer     NOT NULL CHECK (bags_expected > 0),
  bags_tagged     integer     NOT NULL DEFAULT 0,
  bags_stored     integer     NOT NULL DEFAULT 0,  -- reached a bin; never goes down
  bags_dispatched integer     NOT NULL DEFAULT 0,  -- sent to production
  bags_delivered  integer     NOT NULL DEFAULT 0,  -- scanned at production
  bags_damaged    integer     NOT NULL DEFAULT 0,  -- damaged before reaching a bin

  -- Worked out from the counters; never set by hand.
  status          text        NOT NULL DEFAULT 'EXPECTED'
                  CHECK (status IN ('EXPECTED', 'IN_TRANSIT', 'PARTIALLY_STORED', 'STORED',
                                    'PARTIALLY_DISPATCHED', 'DISPATCHED')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- A bag cannot be further along than the step before it.
  CHECK (bags_tagged     BETWEEN 0 AND bags_expected),
  CHECK (bags_stored     BETWEEN 0 AND bags_tagged),
  CHECK (bags_dispatched BETWEEN 0 AND bags_stored),
  CHECK (bags_delivered  BETWEEN 0 AND bags_dispatched),
  CHECK (bags_damaged    >= 0 AND bags_damaged <= bags_tagged),

  -- Agreed for now: one invoice number per garden. A duplicate fails the upload.
  UNIQUE (garden_id, invoice_no)
);
CREATE INDEX stn_lots_stn_id_idx ON stn_lots (stn_id);
CREATE INDEX stn_lots_status_idx ON stn_lots (status);
CREATE TRIGGER stn_lots_updated_at BEFORE UPDATE ON stn_lots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The original Excel rows, e.g. 19 bags at 30 kg and 1 bag at 21.4 kg.
CREATE TABLE stn_lot_lines (
  line_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id         bigint        NOT NULL REFERENCES stn_lots (lot_id) ON DELETE CASCADE,
  bag_count      integer       NOT NULL CHECK (bag_count > 0),
  net_wt_per_bag numeric(10,3) NOT NULL CHECK (net_wt_per_bag >= 0),
  tare_wt        numeric(10,3) CHECK (tare_wt >= 0),
  gross_wt       numeric(10,3) CHECK (gross_wt >= 0)
);
CREATE INDEX stn_lot_lines_lot_id_idx ON stn_lot_lines (lot_id);

-- Which bin(s) a lot is planned for. One row = fits in one bin; several rows = split lot.
CREATE TABLE lot_bin_allocations (
  allocation_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id         bigint      NOT NULL REFERENCES stn_lots (lot_id) ON DELETE CASCADE,
  location_id    bigint      NOT NULL REFERENCES locations (location_id),
  bags_allocated integer     NOT NULL CHECK (bags_allocated > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lot_id, location_id)
);
CREATE INDEX lot_bin_allocations_location_idx ON lot_bin_allocations (location_id);
