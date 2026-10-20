// API 시험: 진짜 스키마(schema.sql)를 node:sqlite 에 띄우고 진짜 SQL 로 돌린다(D1 대역).
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { handle } from "../server/app.js";
import { SUBMIT_DAILY_CAP } from "../server/cafes.js";
import { parseCsv } from "../server/csv.js";

function fakeD1() {
  const db = new DatabaseSync(":memory:");
  db.exec(fs.readFileSync("schema.sql", "utf8"));
  const prepare = (sql) => {
    let params = [];
    const statement = {
      bind(...values) {
        params = values;
        return statement;
      },
      first: async () => db.prepare(sql).get(...params) ?? null,
      all: async () => ({ results: db.prepare(sql).all(...params) }),
      run: async () => ({
        meta: { changes: Number(db.prepare(sql).run(...params).changes) },
      }),
    };
    return statement;
  };
  const batch = async (statements) => {
    db.exec("BEGIN");
    try {
      for (const statement of statements) await statement.run();
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  return { prepare, batch, raw: db };
}

const env = { DB: fakeD1(), ADMIN_PASSWORD: "test-admin-password-123" };
let adminCookie = "";

async function call(method, path, body, { cookie = adminCookie, raw } = {}) {
  const headers = { cookie };
  let payload;
  if (raw !== undefined) payload = raw;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await handle(
    new Request(`https://kohee.test/api${path}`, {
      method,
      headers,
      body: payload,
    }),
    env,
  );
  const type = res.headers.get("content-type") || "";
  return {
    status: res.status,
    headers: res.headers,
    body: type.includes("json") ? await res.json() : await res.text(),
  };
}

const CLIENT = "client-aaaaaaaaaaaaaaaa";
const cafe = (over = {}) => ({
  name: "테스트 카페",
  address: "서울 성동구 연무장길 1",
  desc: "드립",
  lat: 37.54,
  lng: 127.05,
  category: ["drip"],
  ...over,
});
const row = (id) =>
  env.DB.raw.prepare("SELECT * FROM cafes WHERE id = ?").get(id);

// ---- 어드민 잠금 ----
{
  assert.equal(
    (await call("GET", "/cafes", undefined, { cookie: "" })).status,
    401,
  );
  const wrong = await call(
    "POST",
    "/admin/login",
    { password: "nope" },
    { cookie: "" },
  );
  assert.equal(wrong.status, 401);
  const login = await call(
    "POST",
    "/admin/login",
    { password: env.ADMIN_PASSWORD },
    { cookie: "" },
  );
  assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict/);
  adminCookie = setCookie.split(";")[0];
  assert.equal((await call("GET", "/admin/me")).body.admin, true);
  // 서명을 바꾸거나 기한이 지난 쿠키는 어드민이 아니다.
  const [, value] = adminCookie.split("=");
  const [expiresAt, mac] = value.split(".");
  const tampered = `kohee_admin=${Number(expiresAt) + 1}.${mac}`;
  assert.equal(
    (await call("GET", "/admin/me", undefined, { cookie: tampered })).body
      .admin,
    false,
  );
  assert.equal(
    (await call("GET", "/cafes", undefined, { cookie: "kohee_admin=1.abc" }))
      .status,
    401,
  );
}

// ---- 제보(로그인 없음) → 후보 → 공개 → 내리기 → 되살리기 → 완전 삭제 ----
{
  assert.equal(
    (await call("POST", "/submit", cafe())).status,
    400,
    "client_id 없으면 거절",
  );
  const submitted = await call("POST", "/submit", {
    ...cafe({ lat: 99, lng: 99 }),
    client_id: CLIENT,
    reason: "자주 감",
  });
  assert.equal(submitted.status, 201);
  const id = submitted.body.id;
  // 제보는 좌표를 받지 않는다(어드민이 채운다) — 사용자가 보낸 lat/lng 는 버려진다.
  assert.equal(row(id).lat, 0);
  assert.equal(row(id).status, "candidate");
  assert.equal(row(id).client_id, CLIENT);

  const mine = async () =>
    (
      await call("GET", `/my-submits?client_id=${CLIENT}`, undefined, {
        cookie: "",
      })
    ).body.items[0];
  assert.equal((await mine()).state, "reviewing");
  assert.equal(
    (await call("GET", "/data")).body.length,
    0,
    "후보는 공개 목록에 없다",
  );

  assert.equal(
    (await call("POST", "/publish", { id })).body.code,
    "COORDS_REQUIRED",
  );
  assert.equal((await call("POST", "/edit", { id, ...cafe() })).status, 200);
  assert.equal((await call("POST", "/publish", { id })).status, 200);
  assert.equal((await mine()).state, "published");

  const data = await call("GET", "/data");
  assert.equal(data.body.length, 1);
  assert.match(data.headers.get("cache-control"), /max-age=60/);
  // 공개 응답에 운영 메모·제보자 표·제보 사유가 새지 않는다.
  for (const key of [
    "memo",
    "client_id",
    "reason",
    "reject_reason",
    "status",
    "deleted_at",
  ]) {
    assert.equal(key in data.body[0], false, `public leak: ${key}`);
  }
  // 공개 중인 카페는 좌표를 지운 채 저장할 수 없다.
  assert.equal(
    (await call("POST", "/edit", { id, ...cafe({ lat: 0 }) })).body.code,
    "COORDS_REQUIRED",
  );

  assert.equal(
    (await call("POST", "/purge", { id })).status,
    400,
    "공개 중엔 완전 삭제 불가",
  );
  assert.equal(
    (await call("POST", "/delete", { id, reason: "폐업" })).status,
    200,
  );
  assert.equal((await call("GET", "/data")).body.length, 0);
  assert.deepEqual(
    [(await mine()).state, (await mine()).reject_reason],
    ["declined", "폐업"],
  );
  assert.equal((await call("POST", "/restore", { id })).status, 200);
  assert.equal(
    (await call("GET", "/data")).body.length,
    1,
    "되살리면 원래 상태(공개)로",
  );
  await call("POST", "/delete", { id });
  assert.equal((await call("POST", "/purge", { id })).status, 200);
  assert.equal(row(id), undefined);
}

// ---- 하루 상한(로그인·IP 없이 도배 막기) ----
{
  const since = new Date().toISOString();
  for (let i = 0; i < SUBMIT_DAILY_CAP; i += 1) {
    env.DB.raw
      .prepare(
        "INSERT INTO cafes (id, name, address, desc, client_id, created_at, updated_at) VALUES (?, 'x', 'y', 'z', 'c', ?, ?)",
      )
      .run(`cap-${i}`, since, since);
  }
  const over = await call("POST", "/submit", { ...cafe(), client_id: CLIENT });
  assert.equal(over.status, 429);
  env.DB.raw.exec("DELETE FROM cafes WHERE id LIKE 'cap-%'");
}

// ---- CSV: 새 카페만 후보로, 주소가 겹치면 건너뜀, 틀린 행이 있으면 아무것도 안 넣음 ----
{
  assert.deepEqual(parseCsv('h1,h2\r\n"two\nlines","a ""q"""\n\n'), [
    ["h1", "h2"],
    ["two\nlines", 'a "q"'],
  ]);
  await call(
    "POST",
    "/add",
    cafe({ name: "기존", address: "서울 마포구  잔다리로 1" }),
  );
  const csv =
    'name,address,desc,category\n새 카페,서울 1,"여러\n줄",drip\n중복,서울 마포구 잔다리로 1,x,drip';
  const preview = await call("POST", "/import-csv?dryRun=1", undefined, {
    raw: csv,
  });
  assert.equal(preview.body.added, 1);
  assert.equal(preview.body.skipped[0].existing, "기존");
  const before = env.DB.raw.prepare("SELECT COUNT(*) n FROM cafes").get().n;
  const bad = await call("POST", "/import-csv", undefined, {
    raw: "name,address,desc,category\nA,B,C,tea",
  });
  assert.equal(bad.status, 400);
  assert.equal(
    env.DB.raw.prepare("SELECT COUNT(*) n FROM cafes").get().n,
    before,
  );
  const done = await call("POST", "/import-csv", undefined, { raw: csv });
  assert.equal(done.body.added, 1);
  const imported = env.DB.raw
    .prepare("SELECT * FROM cafes WHERE name = '새 카페'")
    .get();
  assert.equal(imported.status, "candidate");
  assert.equal(imported.desc, "여러\n줄");
}

// ---- 오류 제보: 로그인 없이, 답변은 같은 줄에 ----
{
  const sent = await call(
    "POST",
    "/error-report",
    { client_id: CLIENT, title: "주소 틀림", content: "2층" },
    { cookie: "" },
  );
  assert.equal(sent.status, 201);
  assert.equal((await call("GET", "/error-reports")).body.items.length, 1);
  await call("POST", "/reply-error-report", {
    id: sent.body.id,
    message: "고쳤습니다",
  });
  await call("POST", "/resolve-error-report", { id: sent.body.id });
  const mine = (
    await call("GET", `/my-error-reports?client_id=${CLIENT}`, undefined, {
      cookie: "",
    })
  ).body.items[0];
  assert.deepEqual([mine.reply, mine.status], ["고쳤습니다", "resolved"]);
  assert.equal(
    (await call("GET", "/error-reports")).body.items.length,
    0,
    "어드민은 열린 것만",
  );
  assert.equal(
    (await call("POST", "/resolve-error-report", { id: "none" })).status,
    404,
  );
}

// ---- 공지·헤더·없는 경로·좌표 찾기 ----
{
  await call("POST", "/notice", undefined, { raw: "가을 공지" });
  assert.equal((await call("GET", "/notice")).body, "가을 공지");
  const res = await call("GET", "/my-submits?client_id=" + CLIENT, undefined, {
    cookie: "",
  });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.match(
    res.headers.get("content-security-policy"),
    /default-src 'none'/,
  );
  assert.equal((await call("GET", "/nope")).status, 404);
  assert.equal(
    (await call("GET", "/geocode?q=성수동", undefined, { cookie: "" })).status,
    401,
  );

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([{ lat: "37.5", lon: "127.0", display_name: "성수동" }]),
    );
  const hit = await call("GET", "/geocode?q=성수동");
  globalThis.fetch = realFetch;
  assert.deepEqual(
    [hit.body.lat, hit.body.lng, hit.body.label],
    [37.5, 127, "성수동"],
  );
}

console.log("[api] ok");
