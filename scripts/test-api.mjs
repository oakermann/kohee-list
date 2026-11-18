// API tests: load the real schema (schema.sql) into node:sqlite and run the real SQL (D1 stand-in).
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { handle } from "../server/app.js";
import { SUBMIT_DAILY_CAP } from "../server/cafes.js";
import { parseCsv } from "../server/csv.js";
import { GEOCODE_USER_AGENT } from "../server/geocode.js";

// Geocoder stand-in: tests set the reply; the real network is never called. Default = no match.
let geocoder = async () => new Response("[]");
globalThis.fetch = (url, init) => geocoder(url, init);
const geocodeHit = (lat, lng, label) => async () =>
  new Response(
    JSON.stringify([
      { lat: String(lat), lon: String(lng), display_name: label },
    ]),
  );

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

// ---- admin lock ----
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
  // A cookie with a changed signature or past its expiry is not admin.
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

// ---- report (no login) → candidate → publish → unpublish → restore → delete for good ----
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
  // Lat/lng sent by users are discarded; without a geocoder match the report stays coordinate-less.
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
  // Public responses leak no ops memo, reporter token or report reason.
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
  // Coordinates outside South Korea are refused (11/18: a cafe had lng = lat = 37.543).
  for (const coords of [
    { lat: 37.543, lng: 37.543 },
    { lat: 127.05, lng: 37.54 },
  ]) {
    assert.equal(
      (await call("POST", "/edit", { id, ...cafe(coords) })).body.code,
      "COORDS_OUT_OF_RANGE",
    );
  }
  // A published cafe cannot be saved with its coordinates cleared.
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

// ---- daily cap (stops flooding without login or IP) ----
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

// ---- report intake: duplicate addresses refused, coordinates filled from the address when the district matches ----
{
  const submit = (over) =>
    call(
      "POST",
      "/submit",
      { ...cafe(over), client_id: CLIENT },
      { cookie: "" },
    );
  const live = await call(
    "POST",
    "/add",
    cafe({ address: "서울 성동구 성수이로 10 2층" }),
  );
  const dup = await submit({ address: " 서울 성동구  성수이로 10  2층" });
  assert.deepEqual(
    [dup.status, dup.body.error],
    [409, "이미 등록된 카페입니다"],
  );
  await call("POST", "/delete", { id: live.body.id });
  assert.equal(
    (await submit({ address: "서울 성동구 성수이로 10 2층" })).status,
    201,
    "removed cafes do not block",
  );

  let asked;
  geocoder = async (url, init) => {
    asked = { url, ua: init.headers["User-Agent"] };
    return geocodeHit(37.5446, 127.0557, "성수이로, 성수동2가, 성동구, 서울")();
  };
  const hit = row(
    (await submit({ address: "서울 성동구 성수이로 22 (성수동) 3층" })).body.id,
  );
  assert.deepEqual(
    [hit.lat, hit.lng, hit.status],
    [37.5446, 127.0557, "candidate"],
  );
  assert.equal(
    hit.memo,
    "coords: nominatim (road-level), 성수이로, 성수동2가, 성동구, 서울",
  );
  assert.equal(asked.ua, GEOCODE_USER_AGENT);
  assert.match(decodeURIComponent(asked.url), /q=서울 성동구 성수이로 22$/);

  const noCoords = async (reply, address = "서울 성동구 성수이로 30") => {
    geocoder = reply;
    const res = await submit({ address });
    assert.equal(res.status, 201);
    return [row(res.body.id).lat, row(res.body.id).memo];
  };
  assert.deepEqual(
    await noCoords(async () => new Response("[]")),
    [0, ""],
    "miss",
  );
  assert.deepEqual(
    await noCoords(
      geocodeHit(35.1, 129.0, "성수로, 부산진구, 부산"),
      "서울 성동구 성수이로 31",
    ),
    [0, ""],
    "other district = ambiguous",
  );
  assert.deepEqual(
    await noCoords(async () => {
      throw new DOMException("timed out", "TimeoutError");
    }, "서울 성동구 성수이로 32"),
    [0, ""],
    "timeout",
  );
  assert.deepEqual(
    await noCoords(
      async () => new Response("busy", { status: 429 }),
      "서울 성동구 성수이로 33",
    ),
    [0, ""],
    "geocoder refused",
  );
  geocoder = async () => new Response("[]");
}

// ---- bulk publish: every row through the single publish path, one failure does not stop the rest ----
{
  const ready = (
    await call(
      "POST",
      "/add",
      cafe({ name: "준비됨", address: "서울 중구 을지로 1" }),
    )
  ).body.id;
  const bare = (
    await call(
      "POST",
      "/add",
      cafe({
        name: "좌표 없음",
        address: "서울 중구 을지로 2",
        lat: 0,
        lng: 0,
      }),
    )
  ).body.id;
  const res = await call("POST", "/publish-many", {
    ids: [ready, bare, "missing"],
  });
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.results.map((r) => [r.id, r.ok, r.error || ""]),
    [
      [ready, true, ""],
      [bare, false, "Cafe coordinates (lat/lng) are required"],
      ["missing", false, "Cafe not found"],
    ],
  );
  assert.deepEqual(
    [row(ready).status, row(bare).status],
    ["approved", "candidate"],
  );
  assert.equal((await call("POST", "/publish-many", { ids: [] })).status, 400);
  assert.equal(
    (await call("POST", "/publish-many", { ids: [ready] }, { cookie: "" }))
      .status,
    401,
  );
}

// ---- CSV: only new cafes as candidates, skip if the address overlaps, insert nothing if any row is invalid ----
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

// ---- error reports: no login, answers on the same row ----
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

// ---- notices, headers, unknown paths, coordinate lookup ----
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

  geocoder = geocodeHit(37.5, 127.0, "성수동");
  const hit = await call("GET", "/geocode?q=성수동");
  assert.deepEqual(
    [hit.body.lat, hit.body.lng, hit.body.label],
    [37.5, 127, "성수동"],
  );
}

console.log("[api] ok");
