import assert from "node:assert/strict";
import { recordVisit, getVisitStats } from "../server/stats.js";

// recordVisit: 원 IP 가 어떤 형태로도 DB 에 저장되지 않는다 (일 소금 해시만).
{
  const statements = [];
  const env = {
    SESSION_SECRET: "unit-secret",
    DB: {
      prepare(sql) {
        const st = { sql, bindings: [] };
        statements.push(st);
        return {
          bind(...values) {
            st.bindings = values;
            return this;
          },
          run: async () => ({ success: true }),
        };
      },
    },
  };
  const req = new Request("https://kohee.test/data", {
    headers: { "CF-Connecting-IP": "203.0.113.77" },
  });
  await recordVisit(req, env);
  const insert = statements.find((s) => /INSERT INTO visit_stats/i.test(s.sql));
  assert.ok(insert, "visit upsert missing");
  assert.match(insert.sql, /ON CONFLICT\(day, ip_hash\)/i);
  const flat = JSON.stringify(statements);
  assert.equal(flat.includes("203.0.113.77"), false, "raw ip must never reach the DB");
  assert.match(insert.bindings[1], /^[0-9a-f]{64}$/, "ip_hash must be a sha256 hex");
  assert.ok(statements.some((s) => /DELETE FROM visit_stats WHERE day </i.test(s.sql)),
    "retention purge missing");
}

// getVisitStats: 30일 집계 형태 + 합계 계산.
{
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const env = {
    DB: {
      prepare() {
        return {
          all: async () => ({
            results: [
              { day: today, uniques: 3, hits: 9 },
              { day: "2000-01-01", uniques: 5, hits: 5 },
            ],
          }),
        };
      },
    },
  };
  const res = await getVisitStats(new Request("https://kohee.test/stats/visits"), env);
  const body = await res.json();
  assert.equal(body.today.uniques, 3);
  assert.equal(body.last7.uniques, 3);      // 2000년 행은 7일 합계에서 제외
  assert.equal(body.days.length, 2);
}

console.log("[visit-stats] ok");
