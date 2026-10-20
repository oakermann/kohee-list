-- KOHEE LIST 전체 스키마(새로 만들 때·시험용). 운영 DB 는 migrations/ 로만 바꾼다.
-- 회원·세션·IP 를 저장하지 않는다(0011). 제보 = 후보 카페, 제보자는 브라우저 표(client_id)로만 본다.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cafes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  desc TEXT NOT NULL,
  lat REAL NOT NULL DEFAULT 0,
  lng REAL NOT NULL DEFAULT 0,
  signature TEXT NOT NULL DEFAULT '[]',
  beanShop TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  naver_url TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  region_distance_m INTEGER NOT NULL DEFAULT 0,
  memo TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '[]',
  oakerman_pick INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved')),
  client_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  reject_reason TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cafes_public ON cafes(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_cafes_updated_at ON cafes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cafes_client_id ON cafes(client_id);
CREATE INDEX IF NOT EXISTS idx_cafes_created_at ON cafes(created_at);

CREATE TABLE IF NOT EXISTS error_reports (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  title TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  reply TEXT NOT NULL DEFAULT '',
  replied_at TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_reports_status ON error_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_client_id ON error_reports(client_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings(key, value, updated_at)
VALUES ('notice', '', datetime('now'));
