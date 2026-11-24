-- 004: one row per uploaded STN (Stock Transfer Note) Excel file.

CREATE TABLE stn_documents (
  stn_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stn_number  text        NOT NULL UNIQUE,
  stn_date    date        NOT NULL,
  obd_no      text,
  truck_no    text,
  file_path   text,
  -- Hash of the file contents: the same file cannot be uploaded twice.
  file_hash   text        NOT NULL UNIQUE,
  status      text        NOT NULL DEFAULT 'UPLOADED'
              CHECK (status IN ('UPLOADED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  uploaded_by bigint      NOT NULL REFERENCES users (user_id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stn_documents_stn_date_idx ON stn_documents (stn_date);
CREATE INDEX stn_documents_status_idx ON stn_documents (status);
CREATE INDEX stn_documents_uploaded_by_idx ON stn_documents (uploaded_by);
