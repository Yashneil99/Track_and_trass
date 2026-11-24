-- 001: shared helpers, users and login sessions.

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- fuzzy matching of garden names

-- Keeps updated_at honest without every query having to remember it.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  user_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  name          text        NOT NULL,
  role          text        NOT NULL CHECK (role IN ('admin', 'operator', 'production')),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- "Ram@x.com" and "ram@x.com" are the same person.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One row per login. Only a hash of the refresh token is stored, never the token.
CREATE TABLE user_sessions (
  session_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            bigint      NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  refresh_token_hash text        NOT NULL UNIQUE,
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz,
  device_info        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX user_sessions_expires_at_idx ON user_sessions (expires_at);
