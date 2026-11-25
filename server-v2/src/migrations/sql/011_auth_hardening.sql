-- 011: login lockout, last login time, and case-insensitive process names.

-- Wrong passwords are counted per user. At 5 the account is locked for a while.
ALTER TABLE users
  ADD COLUMN failed_login_attempts integer     NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  ADD COLUMN locked_until          timestamptz,
  ADD COLUMN last_login_at         timestamptz;

-- "Blending" and "BLENDING" are the same process.
CREATE UNIQUE INDEX process_definitions_name_lower_key ON process_definitions (lower(name));
