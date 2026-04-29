import assert from "node:assert/strict";

import {
  applyPickPermission,
  deleteCafe,
  getData,
  toCafeResponse,
} from "../server/cafes.js";
import { parseCsvLine } from "../server/csv.js";
import { cleanUrl, parseJsonArray } from "../server/shared.js";

assert.deepEqual(parseCsvLine('a,"b,c","d""e"'), ["a", "b,c", 'd"e']);
assert.deepEqual(parseJsonArray("espresso, drip|null"), ["espresso", "drip"]);
assert.equal(cleanUrl("javascript:alert(1)"), "");
assert.equal(
  cleanUrl("https://example.com/?x=undefined&ok=1"),
  "https://example.com/?ok=1",
);

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

for (const role of ["manager", "admin"]) {
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
}

const unauthorizedDelete = await requestDeleteCafe("user");
assert.equal(unauthorizedDelete.response.status, 403);
assert.equal(
  unauthorizedDelete.statements.some((statement) =>
    /UPDATE\s+cafes\s+SET\s+deleted_at\s*=\s*\?/i.test(statement.sql),
  ),
  false,
);

console.log("[unit] ok");
