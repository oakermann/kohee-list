-- 0009: 일별 방문 집계 (어드민 통계용).
-- 개인정보 비저장 설계: ip_hash = sha256(ip + day + SESSION_SECRET) 로 일 단위 소금이
-- 돌아 원 IP 복원·일 간 추적이 불가능한 익명 카운터다 (원 IP 는 어디에도 저장 안 함).
-- 90일 지난 행은 기록 시 순환 삭제된다 (server/stats.js recordVisit).
CREATE TABLE IF NOT EXISTS visit_stats (
  day TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, ip_hash)
);
