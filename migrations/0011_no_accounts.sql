-- 회원·세션·IP 수집을 없앤다 (2026-10-21, 오너 결정).
-- - 제보는 로그인 없이, 처음부터 후보 카페다: submissions 테이블 삭제, 제보자는 브라우저가 만든
--   무작위 표(client_id)로만 자기 제보를 본다.
-- - 상태는 공개(approved)·후보(candidate) 둘 + 내림(deleted_at). 옛 보류·숨김·반려 카페는 내린 후보로.
-- - 어드민은 비밀번호 하나(Pages 비밀값 ADMIN_PASSWORD) — 사용자·세션 테이블이 없다.
-- - 찜은 브라우저에 저장, 방문 통계는 Cloudflare Web Analytics, 감사 기록은 읽는 곳이 없어 삭제.
-- 백업: ~/Code/backups/kohee/kohee-list-20261021-before-no-login.sql
PRAGMA defer_foreign_keys = true;

CREATE TABLE cafes_new (
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

INSERT INTO cafes_new (
  id, name, address, desc, lat, lng, signature, beanShop, instagram, naver_url,
  region, region_distance_m, memo, category, oakerman_pick, status, deleted_at,
  created_at, updated_at
)
SELECT
  id, name, address, desc, COALESCE(lat, 0), COALESCE(lng, 0),
  COALESCE(signature, '[]'), COALESCE(beanShop, ''), COALESCE(instagram, ''),
  COALESCE(naver_url, ''), COALESCE(region, ''), COALESCE(region_distance_m, 0),
  COALESCE(memo, ''), COALESCE(category, '[]'), oakerman_pick,
  CASE WHEN status = 'approved' THEN 'approved' ELSE 'candidate' END,
  CASE
    WHEN status IN ('hidden', 'rejected')
      THEN COALESCE(deleted_at, hidden_at, rejected_at, updated_at)
    ELSE deleted_at
  END,
  COALESCE(created_at, updated_at), updated_at
FROM cafes;

CREATE TABLE error_reports_new (
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

INSERT INTO error_reports_new (
  id, title, page, content, status, reply, replied_at, resolved_at, created_at
)
SELECT
  e.id, e.title, COALESCE(e.page, ''), e.content, e.status,
  COALESCE(r.message, ''), r.replied_at, e.resolved_at, e.created_at
FROM error_reports e
LEFT JOIN error_report_replies r ON r.report_id = e.id;

CREATE TABLE settings_new (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO settings_new (key, value, updated_at)
SELECT key, value, updated_at FROM settings;

DROP TABLE error_report_replies;
DROP TABLE error_reports;
DROP TABLE favorites;
DROP TABLE submissions;
DROP TABLE sessions;
DROP TABLE audit_logs;
DROP TABLE rate_limits;
DROP TABLE visit_stats;
DROP TABLE settings;
DROP TABLE cafes;
DROP TABLE users;

ALTER TABLE cafes_new RENAME TO cafes;
ALTER TABLE error_reports_new RENAME TO error_reports;
ALTER TABLE settings_new RENAME TO settings;

CREATE INDEX idx_cafes_public ON cafes(status, deleted_at);
CREATE INDEX idx_cafes_updated_at ON cafes(updated_at DESC);
CREATE INDEX idx_cafes_client_id ON cafes(client_id);
CREATE INDEX idx_cafes_created_at ON cafes(created_at);
CREATE INDEX idx_error_reports_status ON error_reports(status, created_at DESC);
CREATE INDEX idx_error_reports_client_id ON error_reports(client_id);
