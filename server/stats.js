// 방문 통계: 공개 /data 호출(=페이지 로드)마다 일별 익명 카운터를 올린다.
//
// 프라이버시 설계(마이그레이션 0009 주석과 한 쌍):
// - 원 IP 는 저장하지 않는다. ip_hash = sha256(ip + day + SESSION_SECRET) 라 소금이
//   날마다 돌아 일 간 추적/재식별이 불가능하다 -> 개인정보가 아닌 익명 통계로 유지.
// - 90일 이전 행은 기록 경로에서 순환 삭제한다(별도 크론 불요).
// - 집계 실패가 공개 API 를 깨면 안 되므로 호출측(getData)은 실패를 삼킨다.
import { json } from "./shared.js";

const RETENTION_DAYS = 90;

function kstDay(now = new Date()) {
  // KST(UTC+9) 기준 날짜 문자열 - 운영자 체감 하루와 일치시킨다.
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function recordVisit(req, env) {
  const day = kstDay();
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const salt = env.SESSION_SECRET || "no-salt";
  const ipHash = await sha256Hex(`${ip}:${day}:${salt}`);
  await env.DB.prepare(
    `INSERT INTO visit_stats(day, ip_hash, hits) VALUES (?, ?, 1)
     ON CONFLICT(day, ip_hash) DO UPDATE SET hits = hits + 1`,
  )
    .bind(day, ipHash)
    .run();
  // 순환 삭제: 하루 첫 기록 언저리에서만 실효가 있지만 멱등이라 매번 돌려도 싸다.
  await env.DB.prepare(
    "DELETE FROM visit_stats WHERE day < date('now', ?)",
  )
    .bind(`-${RETENTION_DAYS} days`)
    .run();
}

// adminOnly() 로 등록된다 - 가드/인증/권한은 라우터 래퍼가 담당하는 평면 핸들러.
export async function getVisitStats(req, env) {
  const rows = await env.DB.prepare(
    `SELECT day, COUNT(*) AS uniques, SUM(hits) AS hits
     FROM visit_stats
     WHERE day >= date('now', '-30 days')
     GROUP BY day
     ORDER BY day DESC`,
  ).all();
  const days = (rows.results || []).map((r) => ({
    day: r.day,
    uniques: Number(r.uniques || 0),
    hits: Number(r.hits || 0),
  }));
  const total = (range) => {
    const cut = kstDay(new Date(Date.now() - range * 86400 * 1000));
    const inRange = days.filter((d) => d.day >= cut);
    return {
      uniques: inRange.reduce((a, d) => a + d.uniques, 0),
      hits: inRange.reduce((a, d) => a + d.hits, 0),
    };
  };
  return json(
    {
      days,
      today: days.find((d) => d.day === kstDay()) || { day: kstDay(), uniques: 0, hits: 0 },
      last7: total(7),
      last30: total(30),
    },
    200,
    req,
    env,
  );
}
