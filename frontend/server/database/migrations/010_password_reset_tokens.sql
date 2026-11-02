CREATE TABLE password_reset_tokens (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_digest char(64) NOT NULL UNIQUE,
  auth_version integer NOT NULL CHECK (auth_version >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
