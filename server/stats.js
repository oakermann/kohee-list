// 방문 통계: 공개 /data 호출(=페이지 로드)마다 일별 익명 카운터를 올린다.
//
// 프라이버시 설계(마이그레이션 0009 주석과 한 쌍):
// - 원 IP 는 저장하지 않는다. ip_hash = sha256(ip + day + SESSION_SECRET) 라 소금이
//   날마다 돌아 일 간 추적/재식별이 불가능하다 -> 개인정보가 아닌 익명 통계로 유지.
// - 그래서 '7일 순방문자' 는 셀 수 없다. 7일·30일 값은 날마다 센 사람의 합이다.
// - 90일 이전 행은 관리자가 통계를 볼 때 지운다 — 공개 읽기 경로에 쓰기를 더하지 않는다.
import { json } from "./shared.js";

const RETENTION_DAYS = 90;
const DAY_MS = 86400 * 1000;

// KST(UTC+9) 날짜 — 저장 키와 모든 기간 경계를 이 하나로 자른다.
function kstDay(daysAgo = 0) {
  return new Date(Date.now() + 9 * 3600 * 1000 - daysAgo * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function recordVisit(req, env) {
  const day = kstDay();
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256Hex(
    `${ip}:${day}:${env.SESSION_SECRET || "no-salt"}`,
  );
  await env.DB.prepare(
    `INSERT INTO visit_stats(day, ip_hash, hits) VALUES (?, ?, 1)
     ON CONFLICT(day, ip_hash) DO UPDATE SET hits = hits + 1`,
  )
    .bind(day, ipHash)
    .run();
}

// adminOnly() 로 등록된다 - 가드/인증/권한은 라우터 래퍼가 담당하는 평면 핸들러.
export async function getVisitStats(req, env) {
  await env.DB.prepare("DELETE FROM visit_stats WHERE day < ?")
    .bind(kstDay(RETENTION_DAYS))
    .run();
  const rows = await env.DB.prepare(
    `SELECT day, COUNT(*) AS uniques, SUM(hits) AS hits
     FROM visit_stats
     WHERE day >= ?
     GROUP BY day
     ORDER BY day DESC`,
  )
    .bind(kstDay(29))
    .all();
  const days = (rows.results || []).map((r) => ({
    day: r.day,
    uniques: Number(r.uniques || 0),
    hits: Number(r.hits || 0),
  }));
  // 오늘 포함 n일.
  const sum = (n) => {
    const inRange = days.filter((d) => d.day >= kstDay(n - 1));
    return {
      uniques: inRange.reduce((a, d) => a + d.uniques, 0),
      hits: inRange.reduce((a, d) => a + d.hits, 0),
    };
  };
  return json(
    {
      days,
      today: sum(1),
      last7: sum(7),
      last30: sum(30),
    },
    200,
    req,
    env,
  );
}
