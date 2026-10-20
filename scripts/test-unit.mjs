import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

import {
  addCafe,
  approveCafe,
  deleteCafe,
  getData,
  holdCafe,
  listCafes,
  restoreCafe,
  unholdCafe,
  toCafeResponse,
} from "../server/cafes.js";
import { importCsv, parseCsv } from "../server/csv.js";
import { getFavorites, toggleFavorite } from "../server/favorites.js";
import { approveSubmission } from "../server/submissions.js";
import {
  cleanUrl,
  health,
  healthDb,
  HttpError,
  parseJsonArray,
  responseHeaders,
  versionInfo,
  withGuard,
} from "../server/shared.js";

const originalConsoleError = console.error;

assert.deepEqual(parseCsv('a,"b,c","d""e"'), [["a", "b,c", 'd"e']]);
// 따옴표 안 줄바꿈은 한 칸이다 — 여러 줄 소개가 행을 깨면 안 된다.
assert.deepEqual(parseCsv('h1,h2\r\n"two\nlines",x\n\n'), [
  ["h1", "h2"],
  ["two\nlines", "x"],
]);
assert.throws(() => parseCsv('a,"b'), /Malformed CSV/);
assert.deepEqual(parseJsonArray("espresso, drip|null"), ["espresso", "drip"]);
assert.equal(cleanUrl("javascript:alert(1)"), "");
assert.equal(
  cleanUrl("https://example.com/?x=undefined&ok=1"),
  "https://example.com/?ok=1",
);

const adminHeaders = responseHeaders(new Request("https://kohee.test/me"), {});
assert.equal(adminHeaders.get("cache-control"), "no-store");
assert.equal(adminHeaders.get("x-content-type-options"), "nosniff");
assert.equal(adminHeaders.get("x-frame-options"), "DENY");
assert.equal(adminHeaders.get("referrer-policy"), "no-referrer");
assert.match(adminHeaders.get("content-security-policy"), /default-src 'none'/);
assert.match(
  adminHeaders.get("permissions-policy"),
  /camera=\(\), microphone=\(\)/,
);

const publicDataHeaders = responseHeaders(
  new Request("https://kohee.test/data"),
  {},
);
assert.equal(
  publicDataHeaders.get("cache-control"),
  "public, max-age=60, s-maxage=60",
);

const healthResponse = health(new Request("https://kohee.test/health"), {});
assert.equal(healthResponse.status, 200);
assert.equal(healthResponse.headers.get("cache-control"), "no-store");
assert.deepEqual(await healthResponse.json(), {
  ok: true,
  service: "kohee-list",
  deployCheck: "codex-worker-20260428",
});

const versionResponse = versionInfo(new Request("https://kohee.test/version"), {
  APP_VERSION: "unit-version",
});
assert.equal(versionResponse.status, 200);
assert.equal(versionResponse.headers.get("cache-control"), "no-store");
assert.deepEqual(await versionResponse.json(), {
  ok: true,
  service: "kohee-list",
  version: "unit-version",
  deployCheck: "codex-worker-20260428",
});

const healthDbResponse = await healthDb(
  new Request("https://kohee.test/health/db"),
  {
    DB: {
      prepare(sql) {
        assert.equal(sql, "SELECT 1 AS ok");
        return { first: async () => ({ ok: 1 }) };
      },
    },
  },
);
assert.equal(healthDbResponse.status, 200);
assert.equal(healthDbResponse.headers.get("cache-control"), "no-store");
assert.deepEqual(await healthDbResponse.json(), {
  ok: true,
  service: "kohee-list",
  db: "ok",
});

console.error = () => {};
const healthDbFailureResponse = await healthDb(
  new Request("https://kohee.test/health/db"),
  {
    DB: {
      prepare() {
        throw new Error("D1_ERROR: secret internal detail");
      },
    },
  },
);
console.error = originalConsoleError;
assert.equal(healthDbFailureResponse.status, 503);
assert.deepEqual(await healthDbFailureResponse.json(), {
  ok: false,
  error: "Database unavailable",
  code: "DB_UNAVAILABLE",
});

console.error = () => {};
const unexpectedErrorResponse = await withGuard(
  new Request("https://kohee.test/data"),
  {},
  async () => {
    throw new Error("D1_ERROR: SELECT * FROM users failed at secret_token");
  },
);
console.error = originalConsoleError;
assert.equal(unexpectedErrorResponse.status, 500);
assert.deepEqual(await unexpectedErrorResponse.json(), {
  ok: false,
  error: "Server error",
  code: "SERVER_ERROR",
});

console.error = () => {};
const internalHttpErrorResponse = await withGuard(
  new Request("https://kohee.test/data"),
  {},
  async () => {
    throw new HttpError(500, "SESSION_SECRET is not configured");
  },
);
console.error = originalConsoleError;
assert.equal(internalHttpErrorResponse.status, 500);
assert.deepEqual(await internalHttpErrorResponse.json(), {
  ok: false,
  error: "Server error",
  code: "SERVER_ERROR",
});

const validationErrorResponse = await withGuard(
  new Request("https://kohee.test/data"),
  {},
  async () => {
    throw new HttpError(400, "name is required", "VALIDATION_ERROR");
  },
);
assert.equal(validationErrorResponse.status, 400);
assert.deepEqual(await validationErrorResponse.json(), {
  ok: false,
  error: "name is required",
  code: "VALIDATION_ERROR",
});

const permissionErrorResponse = await withGuard(
  new Request("https://kohee.test/data"),
  {},
  async () => {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  },
);
assert.equal(permissionErrorResponse.status, 403);
assert.deepEqual(await permissionErrorResponse.json(), {
  ok: false,
  error: "Forbidden",
  code: "FORBIDDEN",
});

assert.deepEqual(
  toCafeResponse({
    id: "cafe-1",
    name: "Approved Cafe",
    address: "Seoul",
    desc: "Coffee",
    lat: 37.5,
    lng: 127,
    signature: '["espresso"]',
    beanShop: "https://example.com",
    instagram: "javascript:alert(1)",
    naver_url: "https://map.naver.com/p/entry/place/1449266862",
    region: "군자역",
    region_distance_m: 466,
    memo: "사장님 통화 완료",
    category: '["espresso"]',
    oakerman_pick: 1,
    manager_pick: 0,
    updated_at: "2026-04-28T00:00:00.000Z",
    status: "approved",
    approved_by: "admin-user",
    deleted_by: "admin-user",
    delete_reason: "internal",
    created_by: "manager-user",
  }),
  {
    id: "cafe-1",
    name: "Approved Cafe",
    address: "Seoul",
    desc: "Coffee",
    lat: 37.5,
    lng: 127,
    signature: ["espresso"],
    beanShop: "https://example.com/",
    instagram: "",
    naver_url: "https://map.naver.com/p/entry/place/1449266862",
    // region is back-data: stored and returned so search can use it, never rendered
    // on the card. memo is operator-only and must not appear here at all.
    region: "군자역",
    region_distance_m: 466,
    category: ["espresso"],
    oakerman_pick: true,
    updated_at: "2026-04-28T00:00:00.000Z",
  },
);

let capturedPublicCafeSql = "";
const publicCafeResponse = await getData(
  new Request("https://kohee.test/data"),
  {
    DB: {
      prepare(sql) {
        if (/INSERT INTO visit_stats/i.test(sql)) {
          return { bind: () => ({ run: async () => ({ success: true }) }) };
        }
        capturedPublicCafeSql = sql;
        return {
          all: async () => ({
            results: [
              {
                id: "cafe-1",
                name: "Approved Cafe",
                address: "Seoul",
                desc: "Coffee",
                lat: 37.5,
                lng: 127,
                signature: '["espresso"]',
                beanShop: "",
                instagram: "",
                category: '["espresso"]',
                oakerman_pick: 0,
                manager_pick: 1,
                updated_at: "2026-04-28T00:00:00.000Z",
                deleted_by: "admin-user",
                delete_reason: "internal",
                approved_by: "admin-user",
              },
            ],
          }),
        };
      },
    },
  },
);
const publicCafeBody = await publicCafeResponse.json();
assert.match(
  capturedPublicCafeSql,
  /WHERE\s+status = 'approved'\s+AND deleted_at IS NULL/i,
);
assert.doesNotMatch(capturedPublicCafeSql, /SELECT\s+\*/i);
assert.deepEqual(Object.keys(publicCafeBody[0]).sort(), [
  "address",
  "beanShop",
  "category",
  "desc",
  "id",
  "instagram",
  "lat",
  "lng",
  "name",
  "naver_url",
  "oakerman_pick",
  "region",
  "region_distance_m",
  "signature",
  "updated_at",
]);
// memo is an operator note: it must never reach the public payload.
assert.equal(publicCafeBody[0].memo, undefined);
assert.equal(publicCafeBody[0].deleted_by, undefined);
assert.equal(publicCafeBody[0].delete_reason, undefined);
assert.equal(publicCafeBody[0].approved_by, undefined);

function createFavoriteTestEnv({
  cafe = { id: "cafe-1" },
  exists = null,
} = {}) {
  const statements = [];
  return {
    statements,
    env: {
      SESSION_SECRET: "unit-secret",
      DB: {
        prepare(sql) {
          const statement = {
            sql,
            bindings: [],
            bind(...values) {
              this.bindings = values;
              statements.push(this);
              return this;
            },
            first: async () => {
              if (/FROM\s+sessions\s+s/i.test(sql)) {
                return {
                  session_id: "session-1",
                  user_id: "user-1",
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                  username: "user",
                  role: "user",
                };
              }
              if (/FROM\s+cafes/i.test(sql)) return cafe;
              if (/FROM\s+favorites/i.test(sql)) return exists;
              return null;
            },
            all: async () => {
              if (/FROM\s+favorites\s+f/i.test(sql)) {
                return {
                  results: [
                    {
                      favorite_id: "favorite-1",
                      created_at: "2026-05-09T00:00:00.000Z",
                      id: "cafe-1",
                      name: "Approved Cafe",
                      address: "Seoul",
                      desc: "Coffee",
                      lat: 37.5,
                      lng: 127,
                      signature: "[]",
                      beanShop: "",
                      instagram: "",
                      category: "[]",
                      oakerman_pick: 0,
                      manager_pick: 0,
                      updated_at: "2026-05-09T00:00:00.000Z",
                    },
                  ],
                };
              }
              return { results: [] };
            },
            run: async () => ({ success: true }),
          };
          return statement;
        },
      },
    },
  };
}

const favoriteList = createFavoriteTestEnv();
const favoriteListResponse = await getFavorites(
  new Request("https://kohee.test/favorites", {
    headers: { authorization: "Bearer unit-token" },
  }),
  favoriteList.env,
);
assert.equal(favoriteListResponse.status, 200);
assert.match(
  favoriteList.statements.find((statement) =>
    /FROM\s+favorites\s+f/i.test(statement.sql),
  ).sql,
  /c\.status = 'approved'\s+AND c\.deleted_at IS NULL/i,
);

const rejectedFavorite = createFavoriteTestEnv({ cafe: null });
const rejectedFavoriteResponse = await toggleFavorite(
  new Request("https://kohee.test/favorites", {
    method: "POST",
    headers: {
      authorization: "Bearer unit-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ cafe_id: "candidate-1", action: "add" }),
  }),
  rejectedFavorite.env,
);
assert.equal(rejectedFavoriteResponse.status, 404);
assert.match(
  rejectedFavorite.statements.find((statement) =>
    /FROM\s+cafes/i.test(statement.sql),
  ).sql,
  /status = 'approved'\s+AND deleted_at IS NULL/i,
);
assert.equal(
  rejectedFavorite.statements.some((statement) =>
    /INSERT\s+OR\s+IGNORE\s+INTO\s+favorites/i.test(statement.sql),
  ),
  false,
);

function createListCafesTestEnv(role = "manager") {
  const statements = [];
  return {
    statements,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: {
        prepare(sql) {
          const statement = { sql, bindings: [] };
          statements.push(statement);
          return {
            bind(...values) {
              statement.bindings = values;
              return this;
            },
            first: async () => {
              if (sql.includes("FROM sessions")) {
                return {
                  session_id: "session-1",
                  user_id: `${role}-user`,
                  username: role,
                  role,
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              return null;
            },
            all: async () => ({
              results: [
                {
                  id: "cafe-1",
                  name: "Admin Cafe",
                  address: "Seoul",
                  desc: "Coffee",
                  lat: 37.5,
                  lng: 127,
                  signature: "[]",
                  beanShop: "",
                  instagram: "",
                  category: '["espresso"]',
                  oakerman_pick: 1,
                  manager_pick: 0,
                  updated_at: "2026-04-28T00:00:00.000Z",
                  status: "approved",
                  deleted_at: "2026-04-29T00:00:00.000Z",
                  hidden_at: "2026-04-28T12:00:00.000Z",
                  hidden_by: "admin-user",
                  deleted_by: "admin-user",
                  delete_reason: "internal",
                },
              ],
            }),
            run: async () => ({ success: true }),
          };
        },
      },
    },
  };
}

async function requestListCafes(lifecycle, role = "admin") {
  const { env, statements } = createListCafesTestEnv(role);
  const response = await listCafes(
    new Request(`https://kohee.test/cafes?lifecycle=${lifecycle}`, {
      headers: { authorization: "Bearer unit-token" },
    }),
    env,
  );
  return { response, statements };
}

const activeList = await requestListCafes("active");
assert.equal(activeList.response.status, 200);
assert.match(
  activeList.statements.find((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ).sql,
  /WHERE\s+deleted_at\s+IS\s+NULL/i,
);

const deletedList = await requestListCafes("deleted");
const deletedListBody = await deletedList.response.json();
assert.match(
  deletedList.statements.find((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ).sql,
  /WHERE\s+deleted_at\s+IS\s+NOT\s+NULL/i,
);
assert.match(
  deletedList.statements.find((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ).sql,
  /hidden_at,\s+hidden_by/i,
);
assert.equal(deletedListBody[0].deleted_at, "2026-04-29T00:00:00.000Z");
assert.equal(deletedListBody[0].hidden_at, "2026-04-28T12:00:00.000Z");
assert.equal(deletedListBody[0].hidden_by, "admin-user");
assert.equal(deletedListBody[0].deleted_by, undefined);
assert.equal(deletedListBody[0].delete_reason, undefined);

const allList = await requestListCafes("all");
assert.doesNotMatch(
  allList.statements.find((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ).sql,
  /WHERE\s+deleted_at/i,
);

function createAddCafeTestEnv(role = "manager") {
  const statements = [];
  return {
    statements,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: {
        prepare(sql) {
          const statement = { sql, bindings: [] };
          statements.push(statement);
          return {
            bind(...values) {
              statement.bindings = values;
              return this;
            },
            first: async () => {
              if (sql.includes("FROM sessions")) {
                return {
                  session_id: "session-1",
                  user_id: `${role}-user`,
                  username: role,
                  role,
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              return null;
            },
            run: async () => ({ success: true }),
          };
        },
      },
    },
  };
}

async function requestAddCafe(role = "manager", overrides = {}) {
  const { env, statements } = createAddCafeTestEnv(role);
  const response = await addCafe(
    new Request("https://kohee.test/add", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "New Cafe",
        address: "Seoul",
        desc: "Coffee",
        lat: 37.5,
        lng: 127,
        category: ["espresso"],
        ...overrides,
      }),
    }),
    env,
  );
  return { response, statements };
}

// 옛 manager 역할은 카페를 넣지 못한다.
const managerAdd = await requestAddCafe("manager");
assert.equal(managerAdd.response.status, 403);

const adminAdd = await requestAddCafe("admin");
assert.equal(adminAdd.response.status, 201);
const adminAddInsert = adminAdd.statements.find((statement) =>
  /INSERT\s+INTO\s+cafes/i.test(statement.sql),
);
assert.equal(adminAddInsert.bindings[15], "candidate");

// naver_url: place URL은 저장되고, 위험 스킴은 cleanUrl이 비운다.
const addWithNaver = await requestAddCafe("admin", {
  naver_url: "https://map.naver.com/p/entry/place/1449266862",
});
assert.equal(addWithNaver.response.status, 201);
const addWithNaverInsert = addWithNaver.statements.find((statement) =>
  /INSERT\s+INTO\s+cafes/i.test(statement.sql),
);
assert.match(addWithNaverInsert.sql, /naver_url/i);
assert.equal(
  addWithNaverInsert.bindings[9],
  "https://map.naver.com/p/entry/place/1449266862",
);
const addBadNaver = await requestAddCafe("admin", {
  naver_url: "javascript:alert(1)",
});
assert.equal(addBadNaver.response.status, 201);
assert.equal(
  addBadNaver.statements.find((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  ).bindings[9],
  "",
);

// Coordinates are mandatory: a cafe with no usable lat/lng must be rejected and
// never inserted, otherwise it would be invisible to the distance feature.
const addCafeNoCoords = await requestAddCafe("admin", { lat: 0, lng: 0 });
assert.equal(addCafeNoCoords.response.status, 400);
const addCafeNoCoordsBody = await addCafeNoCoords.response.json();
assert.equal(addCafeNoCoordsBody.code, "COORDS_REQUIRED");
assert.equal(
  addCafeNoCoords.statements.some((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  ),
  false,
);

function createDeleteCafeTestEnv(role = "manager") {
  const statements = [];
  const cafe = {
    id: "cafe-1",
    name: "Soft Delete Cafe",
    address: "Seoul",
    desc: "Coffee",
    lat: 37.5,
    lng: 127,
    signature: "[]",
    beanShop: "",
    instagram: "",
    category: "[]",
    oakerman_pick: 0,
    manager_pick: 0,
    created_by: "manager-user",
    updated_at: "2026-04-28T00:00:00.000Z",
    status: "approved",
    deleted_at: null,
    deleted_by: null,
  };

  return {
    statements,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: {
        prepare(sql) {
          const statement = { sql, bindings: [] };
          statements.push(statement);
          return {
            bind(...values) {
              statement.bindings = values;
              return this;
            },
            first: async () => {
              if (sql.includes("FROM sessions")) {
                return {
                  session_id: "session-1",
                  user_id: `${role}-user`,
                  username: role,
                  role,
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              if (sql.includes("SELECT * FROM cafes WHERE id = ?")) return cafe;
              return null;
            },
            run: async () => ({ success: true }),
          };
        },
      },
    },
  };
}

async function requestDeleteCafe(role = "manager") {
  const { env, statements } = createDeleteCafeTestEnv(role);
  const response = await deleteCafe(
    new Request("https://kohee.test/delete", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "cafe-1" }),
    }),
    env,
  );
  return { response, statements };
}

for (const role of ["admin"]) {
  const { response, statements } = await requestDeleteCafe(role);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(
    statements.some((statement) =>
      /DELETE\s+FROM\s+cafes/i.test(statement.sql),
    ),
    false,
  );
  assert.equal(
    statements.some((statement) =>
      /DELETE\s+FROM\s+favorites/i.test(statement.sql),
    ),
    false,
  );
  assert.equal(
    statements.some((statement) =>
      /UPDATE\s+submissions\s+SET\s+linked_cafe_id\s*=\s*NULL/i.test(
        statement.sql,
      ),
    ),
    false,
  );

  const softDelete = statements.find((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*\?/i.test(statement.sql),
  );
  assert.ok(softDelete);
  assert.equal(softDelete.bindings[1], `${role}-user`);
  assert.equal(softDelete.bindings[2], softDelete.bindings[0]);
  assert.equal(softDelete.bindings[3], "cafe-1");

  const audit = statements.find((statement) =>
    /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
  );
  assert.ok(audit);
  assert.equal(audit.bindings[2], "cafe.delete");
  assert.match(audit.bindings[6], /"deleted_at"/);
  assert.match(audit.bindings[6], /"deleted_by"/);
  assert.match(audit.bindings[6], /"actor_role":"admin"/);
  assert.doesNotMatch(audit.bindings[6], /password|session|secret/i);
}

const managerDelete = await requestDeleteCafe("manager");
assert.equal(managerDelete.response.status, 403);
assert.equal(
  managerDelete.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*\?/i.test(statement.sql),
  ),
  false,
);

const unauthorizedDelete = await requestDeleteCafe("user");
assert.equal(unauthorizedDelete.response.status, 403);
assert.equal(
  unauthorizedDelete.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*\?/i.test(statement.sql),
  ),
  false,
);

async function requestRestoreCafe(role = "manager") {
  const { env, statements } = createDeleteCafeTestEnv(role);
  const response = await restoreCafe(
    new Request("https://kohee.test/restore", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "cafe-1" }),
    }),
    env,
  );
  return { response, statements };
}

for (const role of ["admin"]) {
  const { response, statements } = await requestRestoreCafe(role);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(
    statements.some((statement) =>
      /DELETE\s+FROM\s+cafes/i.test(statement.sql),
    ),
    false,
  );

  const restore = statements.find((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*NULL/i.test(statement.sql),
  );
  assert.ok(restore);
  assert.match(restore.sql, /deleted_by\s*=\s*NULL/i);
  assert.match(restore.sql, /delete_reason\s*=\s*NULL/i);
  assert.doesNotMatch(restore.sql, /status\s*=/i);
  assert.equal(restore.bindings[1], "cafe-1");

  const audit = statements.find((statement) =>
    /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
  );
  assert.ok(audit);
  assert.equal(audit.bindings[2], "cafe.restore");
  assert.match(audit.bindings[6], /"deleted_at":null/);
  assert.match(audit.bindings[6], /"actor_role":"admin"/);
  assert.doesNotMatch(audit.bindings[6], /password|session|secret/i);
}

const managerRestore = await requestRestoreCafe("manager");
assert.equal(managerRestore.response.status, 403);
assert.equal(
  managerRestore.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*NULL/i.test(statement.sql),
  ),
  false,
);

const unauthorizedRestore = await requestRestoreCafe("user");
assert.equal(unauthorizedRestore.response.status, 403);
assert.equal(
  unauthorizedRestore.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*NULL/i.test(statement.sql),
  ),
  false,
);

async function requestApproveCafe(role = "manager", cafeOverrides = {}) {
  const { env, statements } = createDeleteCafeTestEnv(role);
  const originalPrepare = env.DB.prepare;
  env.DB.prepare = (sql) => {
    const prepared = originalPrepare(sql);
    if (sql.includes("SELECT * FROM cafes WHERE id = ?")) {
      prepared.first = async () => ({
        id: "cafe-1",
        name: "Candidate Cafe",
        address: "Seoul",
        desc: "Coffee",
        lat: 37.5,
        lng: 127,
        signature: "[]",
        beanShop: "",
        instagram: "",
        category: "[]",
        oakerman_pick: 0,
        manager_pick: 0,
        created_by: "manager-user",
        updated_at: "2026-04-28T00:00:00.000Z",
        status: "candidate",
        deleted_at: null,
        deleted_by: null,
        ...cafeOverrides,
      });
    }
    return prepared;
  };

  const response = await approveCafe(
    new Request("https://kohee.test/approve-cafe", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "cafe-1" }),
    }),
    env,
  );
  return { response, statements };
}

const adminApprove = await requestApproveCafe("admin");
assert.equal(adminApprove.response.status, 200);
const approveUpdate = adminApprove.statements.find((statement) =>
  /UPDATE\s+cafes\s+SET\s+status\s*=\s*'approved'/i.test(statement.sql),
);
assert.ok(approveUpdate);
assert.match(approveUpdate.sql, /approved_at\s*=\s*\?/i);
assert.match(approveUpdate.sql, /approved_by\s*=\s*\?/i);
assert.equal(approveUpdate.bindings[1], "admin-user");
assert.equal(approveUpdate.bindings[3], "cafe-1");
const approveAudit = adminApprove.statements.find((statement) =>
  /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
);
assert.ok(approveAudit);
assert.equal(approveAudit.bindings[2], "cafe.approve");
assert.match(approveAudit.bindings[6], /"status":"approved"/);
assert.match(approveAudit.bindings[6], /"actor_role":"admin"/);
assert.doesNotMatch(approveAudit.bindings[6], /password|session|secret/i);

const managerApprove = await requestApproveCafe("manager");
assert.equal(managerApprove.response.status, 403);
assert.equal(
  managerApprove.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'approved'/i.test(statement.sql),
  ),
  false,
);

const unauthorizedApprove = await requestApproveCafe("user");
assert.equal(unauthorizedApprove.response.status, 403);
assert.equal(
  unauthorizedApprove.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'approved'/i.test(statement.sql),
  ),
  false,
);

const deletedCandidateApprove = await requestApproveCafe("admin", {
  deleted_at: "2026-04-29T00:00:00.000Z",
});
assert.equal(deletedCandidateApprove.response.status, 400);
assert.equal(
  deletedCandidateApprove.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'approved'/i.test(statement.sql),
  ),
  false,
);

// 좌표 없는 후보는 공개하지 못한다('내 주변'에서 조용히 빠지므로).
const noCoordsApprove = await requestApproveCafe("admin", { lat: 0, lng: 0 });
assert.equal(noCoordsApprove.response.status, 400);
assert.equal(
  noCoordsApprove.statements.some((statement) =>
    /SET\s+status\s*=\s*'approved'/i.test(statement.sql),
  ),
  false,
);

const hiddenCafeApprove = await requestApproveCafe("admin", {
  status: "hidden",
});
assert.equal(hiddenCafeApprove.response.status, 400);
assert.equal(
  hiddenCafeApprove.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'approved'/i.test(statement.sql),
  ),
  false,
);

async function requestCafeHoldAction(
  action,
  role = "manager",
  cafeOverrides = {},
) {
  const { env, statements } = createDeleteCafeTestEnv(role);
  const originalPrepare = env.DB.prepare;
  env.DB.prepare = (sql) => {
    const prepared = originalPrepare(sql);
    if (sql.includes("SELECT * FROM cafes WHERE id = ?")) {
      prepared.first = async () => ({
        id: "cafe-1",
        name: "Candidate Hold Cafe",
        address: "Seoul",
        desc: "Coffee",
        lat: 37.5,
        lng: 127,
        signature: "[]",
        beanShop: "",
        instagram: "",
        category: "[]",
        oakerman_pick: 0,
        manager_pick: 0,
        created_by: "manager-user",
        updated_at: "2026-04-28T00:00:00.000Z",
        status: action === "hold" ? "candidate" : "hidden",
        deleted_at: null,
        deleted_by: null,
        ...cafeOverrides,
      });
    }
    return prepared;
  };

  const handler = action === "hold" ? holdCafe : unholdCafe;
  const path = action === "hold" ? "/hold-cafe" : "/unhold-cafe";
  const response = await handler(
    new Request(`https://kohee.test${path}`, {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "cafe-1" }),
    }),
    env,
  );
  return { response, statements };
}

const adminHold = await requestCafeHoldAction("hold", "admin");
assert.equal(adminHold.response.status, 200);
const holdUpdate = adminHold.statements.find((statement) =>
  /UPDATE\s+cafes\s+SET\s+status\s*=\s*'hidden'/i.test(statement.sql),
);
assert.ok(holdUpdate);
assert.match(holdUpdate.sql, /hidden_at\s*=\s*\?/i);
assert.match(holdUpdate.sql, /hidden_by\s*=\s*\?/i);
assert.equal(holdUpdate.bindings[1], "admin-user");
assert.equal(holdUpdate.bindings[3], "cafe-1");
const holdAudit = adminHold.statements.find((statement) =>
  /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
);
assert.ok(holdAudit);
assert.equal(holdAudit.bindings[2], "cafe.hold");
assert.match(holdAudit.bindings[6], /"status":"hidden"/);
assert.match(holdAudit.bindings[6], /"actor_role":"admin"/);
assert.doesNotMatch(holdAudit.bindings[6], /password|session|secret/i);

const adminUnhold = await requestCafeHoldAction("unhold", "admin");
assert.equal(adminUnhold.response.status, 200);
const unholdUpdate = adminUnhold.statements.find((statement) =>
  /UPDATE\s+cafes\s+SET\s+status\s*=\s*'candidate'/i.test(statement.sql),
);
assert.ok(unholdUpdate);
assert.match(unholdUpdate.sql, /hidden_at\s*=\s*NULL/i);
assert.match(unholdUpdate.sql, /hidden_by\s*=\s*NULL/i);
assert.equal(unholdUpdate.bindings[1], "cafe-1");
const unholdAudit = adminUnhold.statements.find((statement) =>
  /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
);
assert.ok(unholdAudit);
assert.equal(unholdAudit.bindings[2], "cafe.unhold");
assert.match(unholdAudit.bindings[6], /"status":"candidate"/);
assert.match(unholdAudit.bindings[6], /"hidden_at":null/);
assert.doesNotMatch(unholdAudit.bindings[6], /password|session|secret/i);

const managerHold = await requestCafeHoldAction("hold", "manager");
assert.equal(managerHold.response.status, 403);
assert.equal(
  managerHold.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'hidden'/i.test(statement.sql),
  ),
  false,
);

const unauthorizedUnhold = await requestCafeHoldAction("unhold", "user");
assert.equal(unauthorizedUnhold.response.status, 403);
assert.equal(
  unauthorizedUnhold.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'candidate'/i.test(statement.sql),
  ),
  false,
);

const deletedHold = await requestCafeHoldAction("hold", "admin", {
  deleted_at: "2026-04-29T00:00:00.000Z",
});
assert.equal(deletedHold.response.status, 400);
assert.equal(
  deletedHold.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'hidden'/i.test(statement.sql),
  ),
  false,
);

const approvedHold = await requestCafeHoldAction("hold", "admin", {
  status: "approved",
});
assert.equal(approvedHold.response.status, 400);
assert.equal(
  approvedHold.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'hidden'/i.test(statement.sql),
  ),
  false,
);

const candidateUnhold = await requestCafeHoldAction("unhold", "admin", {
  status: "candidate",
});
assert.equal(candidateUnhold.response.status, 400);
assert.equal(
  candidateUnhold.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status\s*=\s*'candidate'/i.test(statement.sql),
  ),
  false,
);

class AdminClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }

  toggle(value, force) {
    if (force) this.add(value);
    else this.remove(value);
  }
}

class AdminNode {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.classList = new AdminClassList();
    this.dataset = {};
    this.eventListeners = {};
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
    this.textContent = "";
  }

  addEventListener(type, handler) {
    this.eventListeners[type] = handler;
  }

  click() {
    if (this.eventListeners.click) this.eventListeners.click();
  }
}

const adminSource = await fs.readFile("site/assets/admin.js", "utf8");
const adminBody = adminSource
  .replace(/import[\s\S]*?from "\.\/common\.js\?v=[^"]+";\s*/, "")
  .replace(/init\(\)\.catch[\s\S]*$/, "");
const adminContext = {
  console,
  document: {
    createElement: (tagName) => new AdminNode(tagName),
    createTextNode: (text) => {
      const node = new AdminNode("#text");
      node.textContent = text;
      return node;
    },
    querySelectorAll: () => [],
  },
  $: () => new AdminNode(),
  formatDate: (value) => String(value || ""),
  roleLabel: (role) => role,
  api: async () => ({ ok: false, text: async () => "" }),
  jsonApi: async () => ({}),
  clearAuthToken() {},
  alert() {},
  confirm: () => true,
  prompt: () => "",
  location: { href: "" },
};
vm.createContext(adminContext);
vm.runInContext(
  `${adminBody}\nthis.__adminTest = { state, tabItems, cafeState };`,
  adminContext,
);
const adminTest = adminContext.__adminTest;
adminTest.state.submissions = [
  { id: "submission-1", name: "Submitted Cafe", status: "pending" },
];
adminTest.state.cafes = [
  { id: "candidate-1", status: "candidate", deleted_at: null },
  { id: "approved-1", status: "approved", deleted_at: null },
  {
    id: "hold-1",
    status: "hidden",
    hidden_at: "2026-05-06T01:00:00.000Z",
    deleted_at: null,
  },
  { id: "imported-1", status: "hidden", hidden_at: null, deleted_at: null },
  { id: "rejected-1", status: "rejected", deleted_at: null },
  {
    id: "deleted-approved",
    status: "approved",
    deleted_at: "2026-05-06T02:00:00.000Z",
  },
];
const adminTabIds = (tab) =>
  Array.from(adminTest.tabItems(tab), (item) => item.data.id);
assert.deepEqual(adminTabIds("inbox"), ["submission-1", "candidate-1"]);
// Public tab mirrors /data: approved and not deleted, nothing else.
assert.deepEqual(adminTabIds("public"), ["approved-1"]);
assert.deepEqual(adminTabIds("down"), [
  "hold-1",
  "imported-1",
  "rejected-1",
  "deleted-approved",
]);
// Hold (hidden + hidden_at) and legacy imported hidden stay distinguishable.
assert.deepEqual(
  Array.from(adminTest.tabItems("down"), (item) =>
    adminTest.cafeState(item.data),
  ),
  ["hold", "imported", "rejected", "deleted"],
);

function createApproveSubmissionTestEnv(role = "manager") {
  const statements = [];
  return {
    statements,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: {
        prepare(sql) {
          const statement = { sql, bindings: [] };
          statements.push(statement);
          return {
            bind(...values) {
              statement.bindings = values;
              return this;
            },
            first: async () => {
              if (sql.includes("FROM sessions")) {
                return {
                  session_id: "session-1",
                  user_id: `${role}-user`,
                  username: role,
                  role,
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              if (sql.includes("SELECT * FROM submissions WHERE id = ?")) {
                return {
                  id: "submission-1",
                  user_id: "user-1",
                  name: "Submitted Cafe",
                  address: "Seoul",
                  desc: "Coffee",
                  reason: "good",
                  signature: '["espresso"]',
                  beanShop: "",
                  instagram: "",
                  status: "pending",
                  category: '["espresso"]',
                  oakerman_pick: 0,
                  manager_pick: 0,
                  created_at: "2026-04-28T00:00:00.000Z",
                };
              }
              if (sql.includes("SELECT id FROM cafes WHERE id = ?")) {
                return { id: "existing-cafe" };
              }
              return null;
            },
            run: async () => ({ success: true }),
            all: async () => ({ results: [] }),
          };
        },
        batch: async (list) => list.map(() => ({ success: true })),
      },
    },
  };
}

async function requestApproveSubmission(role = "manager", body = {}) {
  const { env, statements } = createApproveSubmissionTestEnv(role);
  const response = await approveSubmission(
    new Request("https://kohee.test/approve", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ submissionId: "submission-1", ...body }),
    }),
    env,
  );
  return { response, statements };
}

const managerSubmissionApprove = await requestApproveSubmission("manager");
assert.equal(managerSubmissionApprove.response.status, 403);
assert.equal(
  managerSubmissionApprove.statements.some((statement) =>
    /INSERT\s+INTO\s+cafes|UPDATE\s+submissions|INSERT\s+INTO\s+audit_logs/i.test(
      statement.sql,
    ),
  ),
  false,
);

for (const role of ["admin"]) {
  const { response, statements } = await requestApproveSubmission(role, {
    lat: 37.5,
    lng: 127,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.linked_cafe_id);

  const cafeInsert = statements.find((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  );
  assert.ok(cafeInsert);
  assert.match(cafeInsert.sql, /status/i);
  assert.doesNotMatch(cafeInsert.sql, /approved_at|approved_by/i);
  assert.equal(cafeInsert.bindings[15], "candidate");
  assert.equal(cafeInsert.bindings[16], `${role}-user`);
  assert.match(cafeInsert.sql, /instagram,\s*naver_url,/i);
  // 수정 후 승인에서 입력한 백데이터가 말없이 버려지면 안 된다.
  assert.match(cafeInsert.sql, /region,\s*region_distance_m,\s*memo/i);

  const submissionUpdate = statements.find((statement) =>
    /UPDATE\s+submissions\s+SET\s+status\s*=\s*'approved'/i.test(statement.sql),
  );
  assert.ok(submissionUpdate);
  assert.equal(submissionUpdate.bindings[0], `${role}-user`);
  assert.equal(submissionUpdate.bindings[3], "submission-1");

  const audit = statements.find((statement) =>
    /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
  );
  assert.ok(audit);
  assert.equal(audit.bindings[2], "submission.approve");
  assert.match(audit.bindings[6], /"status":"approved"/);
  assert.match(audit.bindings[6], /"duplicate":false/);
  assert.doesNotMatch(audit.bindings[6], /password|session|secret/i);
}

// Approving a non-duplicate submission creates a public-track cafe, so it must
// also require coordinates and must not insert a coordinate-less cafe.
const approveNoCoords = await requestApproveSubmission("admin");
assert.equal(approveNoCoords.response.status, 400);
const approveNoCoordsBody = await approveNoCoords.response.json();
assert.equal(approveNoCoordsBody.code, "COORDS_REQUIRED");
assert.equal(
  approveNoCoords.statements.some((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  ),
  false,
);

const duplicateApprove = await requestApproveSubmission("admin", {
  duplicate: true,
  linkedCafeId: "existing-cafe",
});
assert.equal(duplicateApprove.response.status, 200);
assert.equal(
  duplicateApprove.statements.some((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  ),
  false,
);
assert.equal(
  duplicateApprove.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+status/i.test(statement.sql),
  ),
  false,
);
const duplicateAudit = duplicateApprove.statements.find((statement) =>
  /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
);
assert.ok(duplicateAudit);
assert.match(duplicateAudit.bindings[6], /"duplicate":true/);

function createFavoritesTestEnv({
  cafeStatus = "approved",
  deletedAt = null,
  favoriteExists = false,
} = {}) {
  const statements = [];
  const favoriteRows = [
    {
      favorite_id: "fav-approved",
      created_at: "2026-05-06T00:00:00.000Z",
      id: "approved-cafe",
      name: "Approved Cafe",
      address: "Seoul",
      desc: "Coffee",
      lat: 37.5,
      lng: 127,
      signature: '["espresso"]',
      beanShop: "",
      instagram: "",
      category: '["espresso"]',
      oakerman_pick: 1,
      manager_pick: 0,
      updated_at: "2026-05-06T00:00:00.000Z",
      status: "approved",
      deleted_at: null,
    },
    {
      favorite_id: "fav-candidate",
      created_at: "2026-05-06T00:00:00.000Z",
      id: "candidate-cafe",
      name: "Candidate Cafe",
      address: "Seoul",
      desc: "Coffee",
      status: "candidate",
      deleted_at: null,
    },
    {
      favorite_id: "fav-hidden",
      created_at: "2026-05-06T00:00:00.000Z",
      id: "hidden-cafe",
      name: "Hidden Cafe",
      address: "Seoul",
      desc: "Coffee",
      status: "hidden",
      deleted_at: null,
    },
    {
      favorite_id: "fav-deleted",
      created_at: "2026-05-06T00:00:00.000Z",
      id: "deleted-cafe",
      name: "Deleted Cafe",
      address: "Seoul",
      desc: "Coffee",
      status: "approved",
      deleted_at: "2026-05-06T01:00:00.000Z",
    },
  ];

  return {
    statements,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: {
        prepare(sql) {
          const statement = { sql, bindings: [] };
          statements.push(statement);
          return {
            bind(...values) {
              statement.bindings = values;
              return this;
            },
            first: async () => {
              if (sql.includes("FROM sessions")) {
                return {
                  session_id: "session-1",
                  user_id: "user-1",
                  username: "user",
                  role: "user",
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              if (sql.includes("FROM cafes")) {
                if (
                  /status\s*=\s*'approved'/i.test(sql) &&
                  /deleted_at\s+IS\s+NULL/i.test(sql) &&
                  cafeStatus === "approved" &&
                  !deletedAt
                ) {
                  return { id: "cafe-1" };
                }
                return null;
              }
              if (sql.includes("FROM favorites")) {
                return favoriteExists ? { id: "favorite-1" } : null;
              }
              return null;
            },
            all: async () => {
              if (sql.includes("FROM favorites")) {
                const appliesPublicFilter =
                  /c\.status\s*=\s*'approved'/i.test(sql) &&
                  /c\.deleted_at\s+IS\s+NULL/i.test(sql);
                return {
                  results: appliesPublicFilter
                    ? favoriteRows.filter(
                        (row) => row.status === "approved" && !row.deleted_at,
                      )
                    : favoriteRows,
                };
              }
              return { results: [] };
            },
            run: async () => ({ success: true }),
          };
        },
      },
    },
  };
}

async function requestFavorites() {
  const { env, statements } = createFavoritesTestEnv();
  const response = await getFavorites(
    new Request("https://kohee.test/favorites", {
      headers: { authorization: "Bearer unit-token" },
    }),
    env,
  );
  return { response, statements };
}

async function requestToggleFavorite(body, options = {}) {
  const { env, statements } = createFavoritesTestEnv(options);
  const response = await toggleFavorite(
    new Request("https://kohee.test/favorite", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ cafe_id: "cafe-1", ...body }),
    }),
    env,
  );
  return { response, statements };
}

const favoritesResult = await requestFavorites();
assert.equal(favoritesResult.response.status, 200);
const favoritesBody = await favoritesResult.response.json();
assert.deepEqual(
  favoritesBody.items.map((item) => item.cafe.name),
  ["Approved Cafe"],
);
const favoritesQuery = favoritesResult.statements.find((statement) =>
  /FROM\s+favorites/i.test(statement.sql),
);
assert.match(favoritesQuery.sql, /c\.status\s*=\s*'approved'/i);
assert.match(favoritesQuery.sql, /c\.deleted_at\s+IS\s+NULL/i);

for (const options of [
  { cafeStatus: "candidate" },
  { cafeStatus: "hidden" },
  { cafeStatus: "approved", deletedAt: "2026-05-06T01:00:00.000Z" },
]) {
  for (const action of ["add", "toggle"]) {
    const blockedFavorite = await requestToggleFavorite({ action }, options);
    assert.equal(blockedFavorite.response.status, 404);
    assert.equal(
      blockedFavorite.statements.some((statement) =>
        /INSERT\s+OR\s+IGNORE\s+INTO\s+favorites/i.test(statement.sql),
      ),
      false,
    );
  }
}

const addFavorite = await requestToggleFavorite({ action: "add" });
assert.equal(addFavorite.response.status, 200);
assert.equal((await addFavorite.response.json()).favored, true);
assert.ok(
  addFavorite.statements.some((statement) =>
    /INSERT\s+OR\s+IGNORE\s+INTO\s+favorites/i.test(statement.sql),
  ),
);

const staleRemove = await requestToggleFavorite(
  { action: "remove" },
  { cafeStatus: "hidden", favoriteExists: true },
);
assert.equal(staleRemove.response.status, 200);
assert.equal((await staleRemove.response.json()).favored, false);
assert.ok(
  staleRemove.statements.some((statement) =>
    /DELETE\s+FROM\s+favorites/i.test(statement.sql),
  ),
);

const invalidAction = await requestToggleFavorite({ action: "invalid" });
assert.equal(invalidAction.response.status, 400);
assert.deepEqual(await invalidAction.response.json(), {
  ok: false,
  error: "Invalid action",
  code: "VALIDATION_ERROR",
});

const redundantAdd = await requestToggleFavorite(
  { action: "add" },
  { favoriteExists: true },
);
assert.equal(redundantAdd.response.status, 200);
assert.equal((await redundantAdd.response.json()).favored, true);
assert.equal(
  redundantAdd.statements.some((statement) =>
    /INSERT\s+OR\s+IGNORE\s+INTO\s+favorites/i.test(statement.sql),
  ),
  false,
);

const redundantRemove = await requestToggleFavorite(
  { action: "remove" },
  { favoriteExists: false },
);
assert.equal(redundantRemove.response.status, 200);
assert.equal((await redundantRemove.response.json()).favored, false);
assert.equal(
  redundantRemove.statements.some((statement) =>
    /DELETE\s+FROM\s+favorites/i.test(statement.sql),
  ),
  false,
);

function createImportCsvTestEnv(role = "admin") {
  const statements = [];
  const batches = [];
  const prepare = (sql) => {
    const statement = { sql, bindings: [] };
    statements.push(statement);
    return {
      bind(...values) {
        statement.bindings = values;
        return this;
      },
      first: async () =>
        sql.includes("FROM sessions")
          ? {
              session_id: "session-1",
              user_id: `${role}-user`,
              username: role,
              role,
              expires_at: "2999-01-01T00:00:00.000Z",
              csrf_token_hash: "",
            }
          : null,
      all: async () => ({
        results: [
          { name: "Existing Cafe", address: "서울 성동구  연무장길 1" },
        ],
      }),
      run: async () => ({ success: true }),
    };
  };
  return {
    statements,
    batches,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: { prepare, batch: async (list) => batches.push(list) },
    },
  };
}

async function requestImportCsv(body, { role = "admin", dryRun = false } = {}) {
  const { env, statements, batches } = createImportCsvTestEnv(role);
  const response = await importCsv(
    new Request(`https://kohee.test/import-csv${dryRun ? "?dryRun=1" : ""}`, {
      method: "POST",
      headers: { authorization: "Bearer unit-token" },
      body,
    }),
    env,
  );
  return { response, statements, batches, payload: await response.json() };
}

{
  // 새 행만 후보로, 주소(공백 무시)가 이미 있으면 건너뛴다. 기존 카페를 고치는 SQL 은 없다.
  const csvBody =
    'name,address,desc,status,category\nNew Cafe,Seoul 1,"Coffee\nsecond line",approved,drip\nDup,서울 성동구 연무장길 1,Coffee,approved,drip';
  const imported = await requestImportCsv(csvBody);
  assert.equal(imported.response.status, 200);
  assert.equal(imported.payload.added, 1);
  assert.deepEqual(
    Array.from(imported.payload.skipped, (row) => row.existing),
    ["Existing Cafe"],
  );
  assert.equal(imported.batches.length, 1);
  assert.equal(imported.batches[0].length, 1);
  const insert = imported.statements.find((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  );
  assert.equal(insert.bindings[1], "New Cafe");
  assert.equal(insert.bindings[3], "Coffee\nsecond line");
  assert.equal(insert.bindings[12], "candidate");
  assert.equal(
    imported.statements.some((statement) =>
      /UPDATE\s+cafes/i.test(statement.sql),
    ),
    false,
  );
  const audit = imported.statements.find((statement) =>
    /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
  );
  assert.equal(audit.bindings[2], "csv.import");
  assert.doesNotMatch(audit.bindings[6], /password|session|secret/i);

  // 틀린 행이 하나라도 있으면 아무것도 넣지 않는다. 검증(dryRun)은 행별 사유를 돌려준다.
  const bad = "name,address,desc,category\nBad,Seoul,Coffee,tea";
  const rejected = await requestImportCsv(bad);
  assert.equal(rejected.response.status, 400);
  assert.equal(rejected.batches.length, 0);
  const preview = await requestImportCsv(bad, { dryRun: true });
  assert.equal(preview.response.status, 200);
  assert.equal(preview.payload.failedRows[0].error, "Invalid category value");
  assert.equal(preview.batches.length, 0);

  for (const role of ["manager", "user"]) {
    const unauthorized = await requestImportCsv(csvBody, { role });
    assert.equal(unauthorized.response.status, 403);
    assert.equal(unauthorized.batches.length, 0);
  }
}

console.log("[unit] ok");

// 소개에 박힌 "<역> <거리>"는 버리는 게 아니라 백데이터 칸으로 옮긴다.
{
  const { moveDistanceToBackdata } =
    await import("./move-desc-distance-to-backdata.mjs");
  assert.deepEqual(
    moveDistanceToBackdata("군자역 466m 작지만 아늑한 소형 로스터리"),
    {
      region: "군자역",
      region_distance_m: 466,
      desc: "작지만 아늑한 소형 로스터리",
    },
  );
  // 괄호와 연결어까지 한 덩어리로 들어내야 "(군자역에서)" 같은 찌꺼기가 안 남는다.
  assert.deepEqual(
    moveDistanceToBackdata("작지만 아늑한 소형 로스터리 (군자역에서 466m)"),
    {
      region: "군자역",
      region_distance_m: 466,
      desc: "작지만 아늑한 소형 로스터리",
    },
  );
  // km는 미터로 환산해 저장한다.
  assert.deepEqual(moveDistanceToBackdata("서울역 도보 1.2km, 조용한 공간"), {
    region: "서울역",
    region_distance_m: 1200,
    desc: "조용한 공간",
  });
  // 옮긴 것만 지운다: 지역명이 없으면 소개를 한 글자도 건드리지 않는다.
  // "천장고 5m"는 거리가 아니라 치수이므로 그대로 남아야 한다.
  assert.equal(moveDistanceToBackdata("천장고 5m 넓은 공간"), null);
  assert.equal(moveDistanceToBackdata("원두 466ml 판매"), null);
  assert.equal(moveDistanceToBackdata("거리 없는 평범한 소개"), null);
  console.log("[move-desc-distance-to-backdata] ok");
}
