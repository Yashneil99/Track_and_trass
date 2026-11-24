-- 009: outward requests (sending bags to production).

CREATE TABLE outward_requests (
  request_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id  bigint      NOT NULL REFERENCES locations (location_id),
  requested_by bigint      NOT NULL REFERENCES users (user_id),
  purpose      text        NOT NULL DEFAULT 'PRODUCTION' CHECK (purpose IN ('PRODUCTION', 'DISPATCH')),
  status       text        NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING', 'PICKING', 'COMPLETED', 'CANCELLED')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
-- The database itself allows one pending request per location.
CREATE UNIQUE INDEX outward_requests_one_pending_idx ON outward_requests (location_id)
  WHERE status = 'PENDING';
CREATE INDEX outward_requests_status_idx ON outward_requests (status, created_at);
CREATE INDEX outward_requests_requested_by_idx ON outward_requests (requested_by);

-- What was asked for: garden + grade (+ invoice) and how many bags.
CREATE TABLE outward_request_lines (
  line_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id     bigint  NOT NULL REFERENCES outward_requests (request_id) ON DELETE CASCADE,
  garden_id      bigint  NOT NULL REFERENCES gardens (garden_id),
  grade          text,
  invoice_no     text,
  bags_requested integer NOT NULL CHECK (bags_requested > 0),
  bags_picked    integer NOT NULL DEFAULT 0,
  CHECK (bags_picked BETWEEN 0 AND bags_requested),
  UNIQUE (line_id, request_id)       -- lets the next table prove a line belongs to the request
);
CREATE INDEX outward_request_lines_request_idx ON outward_request_lines (request_id);
CREATE INDEX outward_request_lines_garden_idx ON outward_request_lines (garden_id);

-- Exactly which bags left. A bag leaves once: tags are reused, bags are not.
CREATE TABLE outward_request_bags (
  request_id bigint      NOT NULL,
  line_id    bigint      NOT NULL,
  bag_id     bigint      NOT NULL UNIQUE REFERENCES bags (bag_id),
  picked_by  bigint      NOT NULL REFERENCES users (user_id),
  picked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, bag_id),
  FOREIGN KEY (line_id, request_id) REFERENCES outward_request_lines (line_id, request_id)
);
CREATE INDEX outward_request_bags_line_idx ON outward_request_bags (line_id);
CREATE INDEX outward_request_bags_picked_by_idx ON outward_request_bags (picked_by);
