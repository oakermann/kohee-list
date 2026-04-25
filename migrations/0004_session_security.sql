ALTER TABLE sessions ADD COLUMN csrf_token_hash TEXT DEFAULT '';
ALTER TABLE sessions ADD COLUMN user_agent TEXT DEFAULT '';
ALTER TABLE sessions ADD COLUMN ip_hash TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_sessions_ip_hash ON sessions(ip_hash);
