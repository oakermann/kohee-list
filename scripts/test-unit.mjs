import assert from "node:assert/strict";

import {
  addCafe,
  approveCafe,
  applyPickPermission,
  deleteCafe,
  getData,
  holdCafe,
  listCafes,
  restoreCafe,
  unholdCafe,
  toCafeResponse,
} from "../server/cafes.js";
import { importCsv, parseCsvLine, resetCsv } from "../server/csv.js";
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

assert.deepEqual(parseCsvLine('a,"b,c","d""e"'), ["a", "b,c", 'd"e']);
assert.throws(() => parseCsvLine('a,"b'), /Malformed CSV row/);
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
  applyPickPermission(
    "manager",
    { oakerman_pick: true, manager_pick: true },
    { oakerman_pick: 1 },
  ),
  { oakerman_pick: 1, manager_pick: 1 },
);
assert.deepEqual(
  applyPickPermission("admin", { oakerman_pick: true, manager_pick: false }),
  { oakerman_pick: 1, manager_pick: 0 },
);

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
    category: ["espresso"],
    oakerman_pick: true,
    manager_pick: false,
    updated_at: "2026-04-28T00:00:00.000Z",
  },
);

let capturedPublicCafeSql = "";
const publicCafeResponse = await getData(
  new Request("https://kohee.test/data"),
  {
    DB: {
      prepare(sql) {
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
  "manager_pick",
  "name",
  "oakerman_pick",
  "signature",
  "updated_at",
]);
assert.equal(publicCafeBody[0].deleted_by, undefined);
assert.equal(publicCafeBody[0].delete_reason, undefined);
assert.equal(publicCafeBody[0].approved_by, undefined);

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

async function requestListCafes(lifecycle, role = "manager") {
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
assert.equal(deletedListBody[0].deleted_at, "2026-04-29T00:00:00.000Z");
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

async function requestAddCafe(role = "manager") {
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
        category: ["espresso"],
      }),
    }),
    env,
  );
  return { response, statements };
}

const managerAdd = await requestAddCafe("manager");
assert.equal(managerAdd.response.status, 201);
const managerAddInsert = managerAdd.statements.find((statement) =>
  /INSERT\s+INTO\s+cafes/i.test(statement.sql),
);
assert.ok(managerAddInsert);
assert.match(managerAddInsert.sql, /status/i);
assert.equal(managerAddInsert.bindings[12], "candidate");

const adminAdd = await requestAddCafe("admin");
assert.equal(adminAdd.response.status, 201);
const adminAddInsert = adminAdd.statements.find((statement) =>
  /INSERT\s+INTO\s+cafes/i.test(statement.sql),
);
assert.equal(adminAddInsert.bindings[12], "candidate");

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

for (const role of ["manager", "admin"]) {
  const { response, statements } = await requestApproveSubmission(role);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.linked_cafe_id);

  const cafeInsert = statements.find((statement) =>
    /INSERT\s+INTO\s+cafes/i.test(statement.sql),
  );
  assert.ok(cafeInsert);
  assert.match(cafeInsert.sql, /status/i);
  assert.doesNotMatch(cafeInsert.sql, /approved_at|approved_by/i);
  assert.equal(cafeInsert.bindings[12], "candidate");
  assert.equal(cafeInsert.bindings[13], `${role}-user`);

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

const duplicateApprove = await requestApproveSubmission("manager", {
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

let candidatePublicSql = "";
await getData(new Request("https://kohee.test/data"), {
  DB: {
    prepare(sql) {
      candidatePublicSql = sql;
      return { all: async () => ({ results: [] }) };
    },
  },
});
assert.match(
  candidatePublicSql,
  /WHERE\s+status = 'approved'\s+AND deleted_at IS NULL/i,
);

function createResetCsvTestEnv(role = "admin") {
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
              if (sql.includes("FROM cafes") && sql.includes("lower(trim")) {
                return {
                  id: "cafe-1",
                  name: "Imported Cafe",
                  oakerman_pick: 1,
                  manager_pick: 0,
                  status: "candidate",
                  deleted_at: "2026-04-28T00:00:00.000Z",
                };
              }
              if (sql.includes("COUNT(*) AS c FROM cafes")) return { c: 2 };
              return null;
            },
            run: async () => ({ success: true }),
          };
        },
      },
    },
  };
}

async function requestResetCsv(
  role = "admin",
  body = "name,address,desc,category\nImported Cafe,Seoul,Coffee,espresso",
) {
  const { env, statements } = createResetCsvTestEnv(role);
  const response = await resetCsv(
    new Request("https://kohee.test/reset-csv", {
      method: "POST",
      headers: { authorization: "Bearer unit-token" },
      body,
    }),
    env,
  );
  return { response, statements };
}

const resetResult = await requestResetCsv("admin");
assert.equal(resetResult.response.status, 200);
const resetBody = await resetResult.response.json();
assert.equal(resetBody.ok, true);
assert.equal(resetBody.deleted, 2);
assert.equal(resetBody.updated, 1);
assert.equal(resetBody.duplicated, 1);
assert.ok(
  resetResult.statements.some((statement) =>
    /COUNT\(\*\)\s+AS\s+c\s+FROM\s+cafes\s+WHERE\s+deleted_at\s+IS\s+NULL/i.test(
      statement.sql,
    ),
  ),
);
assert.equal(
  resetResult.statements.some((statement) =>
    /DELETE\s+FROM\s+cafes/i.test(statement.sql),
  ),
  false,
);
assert.equal(
  resetResult.statements.some((statement) =>
    /DELETE\s+FROM\s+favorites/i.test(statement.sql),
  ),
  false,
);
assert.equal(
  resetResult.statements.some((statement) =>
    /UPDATE\s+submissions\s+SET\s+linked_cafe_id\s*=\s*NULL/i.test(
      statement.sql,
    ),
  ),
  false,
);
const resetSoftDelete = resetResult.statements.find((statement) =>
  /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*\?/i.test(statement.sql),
);
assert.ok(resetSoftDelete);
assert.match(resetSoftDelete.sql, /WHERE\s+deleted_at\s+IS\s+NULL/i);
assert.equal(resetSoftDelete.bindings[1], "admin-user");
assert.equal(resetSoftDelete.bindings[2], resetSoftDelete.bindings[0]);
const resetAudit = resetResult.statements.find((statement) =>
  /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
);
assert.ok(resetAudit);
assert.equal(resetAudit.bindings[2], "csv.reset");
assert.match(resetAudit.bindings[6], /"deleted_at"/);
assert.match(resetAudit.bindings[6], /"deleted_by"/);
assert.match(resetAudit.bindings[6], /"actor_role":"admin"/);
assert.doesNotMatch(resetAudit.bindings[6], /password|session|secret/i);
const resetImportUpdate = resetResult.statements.find((statement) =>
  /UPDATE\s+cafes\s+SET\s+name\s*=\s*\?/i.test(statement.sql),
);
assert.ok(resetImportUpdate);
assert.match(resetImportUpdate.sql, /status\s*=\s*\?/i);
assert.equal(resetImportUpdate.bindings[11], "candidate");
assert.match(resetImportUpdate.sql, /deleted_at\s*=\s*NULL/i);

const unauthorizedReset = await requestResetCsv("manager");
assert.equal(unauthorizedReset.response.status, 403);
assert.equal(
  unauthorizedReset.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*\?/i.test(statement.sql),
  ),
  false,
);

for (const invalidCsv of [
  "name,address\nBad,Seoul",
  "name,address,desc,category\nBad,Seoul,Coffee,tea",
  "name,address,desc,status\nBad,Seoul,Coffee,published",
  "name,address,desc\n,Seoul,Coffee",
  'name,address,desc\nBad,Seoul,"Coffee',
]) {
  const invalidReset = await requestResetCsv("admin", invalidCsv);
  assert.equal(invalidReset.response.status, 400);
  assert.equal(
    invalidReset.statements.some((statement) =>
      /UPDATE\s+cafes\s+SET/i.test(statement.sql),
    ),
    false,
  );
  assert.equal(
    invalidReset.statements.some((statement) =>
      /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
    ),
    false,
  );
}

function createImportCsvTestEnv(role = "admin", existingCafe = true) {
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
              if (sql.includes("FROM cafes") && sql.includes("lower(trim")) {
                if (!existingCafe) return null;
                return {
                  id: "cafe-1",
                  name: "Imported Cafe",
                  oakerman_pick: 1,
                  manager_pick: 0,
                  status: "candidate",
                  deleted_at: "2026-04-28T00:00:00.000Z",
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

async function requestImportCsv(
  role = "admin",
  body = "name,address,desc\nImported Cafe,Seoul,Coffee",
  existingCafe = true,
) {
  const { env, statements } = createImportCsvTestEnv(role, existingCafe);
  const response = await importCsv(
    new Request("https://kohee.test/import-csv", {
      method: "POST",
      headers: { authorization: "Bearer unit-token" },
      body,
    }),
    env,
  );
  return { response, statements };
}

const { response: importResponse, statements: importStatements } =
  await requestImportCsv();
assert.equal(importResponse.status, 200);
const importUpdate = importStatements.find((statement) =>
  /UPDATE\s+cafes\s+SET/i.test(statement.sql),
);
assert.ok(importUpdate);
assert.match(importUpdate.sql, /status\s*=\s*\?/i);
assert.equal(importUpdate.bindings[11], "candidate");
assert.match(importUpdate.sql, /deleted_at\s*=\s*NULL/i);
assert.match(importUpdate.sql, /deleted_by\s*=\s*NULL/i);
assert.match(importUpdate.sql, /delete_reason\s*=\s*NULL/i);

const { response: importNewResponse, statements: importNewStatements } =
  await requestImportCsv(
    "admin",
    "name,address,desc\nNew Cafe,Seoul,Coffee",
    false,
  );
assert.equal(importNewResponse.status, 200);
const importNewInsert = importNewStatements.find((statement) =>
  /INSERT\s+INTO\s+cafes/i.test(statement.sql),
);
assert.ok(importNewInsert);
assert.match(importNewInsert.sql, /status/i);
assert.equal(importNewInsert.bindings[12], "candidate");

const {
  response: importApprovedResponse,
  statements: importApprovedStatements,
} = await requestImportCsv(
  "admin",
  "name,address,desc,status\nApproved CSV,Seoul,Coffee,approved",
  false,
);
assert.equal(importApprovedResponse.status, 200);
const importApprovedInsert = importApprovedStatements.find((statement) =>
  /INSERT\s+INTO\s+cafes/i.test(statement.sql),
);
assert.equal(importApprovedInsert.bindings[12], "approved");

const invalidImport = await requestImportCsv(
  "admin",
  "name,address,desc,category\nBad,Seoul,Coffee,tea",
);
assert.equal(invalidImport.response.status, 400);
assert.equal(
  invalidImport.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET/i.test(statement.sql),
  ),
  false,
);

for (const role of ["manager", "user"]) {
  const unauthorizedImport = await requestImportCsv(role);
  assert.equal(unauthorizedImport.response.status, 403);
  assert.equal(
    unauthorizedImport.statements.some((statement) =>
      /UPDATE\s+cafes\s+SET/i.test(statement.sql),
    ),
    false,
  );
}

const dryRunInvalidImport = await importCsv(
  new Request("https://kohee.test/import-csv", {
    method: "POST",
    headers: { authorization: "Bearer unit-token" },
    body: "name,address,desc,category\nBad,Seoul,Coffee,tea",
  }),
  createImportCsvTestEnv("admin").env,
);
assert.equal(dryRunInvalidImport.status, 400);

const dryRunInvalidPreview = await importCsv(
  new Request("https://kohee.test/import-csv?dryRun=1", {
    method: "POST",
    headers: { authorization: "Bearer unit-token" },
    body: "name,address,desc,category\nBad,Seoul,Coffee,tea",
  }),
  createImportCsvTestEnv("admin").env,
);
assert.equal(dryRunInvalidPreview.status, 200);
const dryRunInvalidBody = await dryRunInvalidPreview.json();
assert.equal(dryRunInvalidBody.failed, 1);
assert.equal(dryRunInvalidBody.failedRows[0].error, "Invalid category value");

const importAudit = importStatements.find((statement) =>
  /INSERT\s+INTO\s+audit_logs/i.test(statement.sql),
);
assert.ok(importAudit);
assert.equal(importAudit.bindings[2], "csv.import");
assert.match(importAudit.bindings[6], /"actor_role":"admin"/);
assert.doesNotMatch(importAudit.bindings[6], /password|session|secret/i);

console.log("[unit] ok");
