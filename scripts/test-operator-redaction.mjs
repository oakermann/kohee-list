import assert from "node:assert/strict";

import { ROUTES } from "../server/routes.js";

function findRoute(method, routePath) {
  const route = ROUTES.find(
    ([routeMethod, path]) => routeMethod === method && path === routePath,
  );
  assert.ok(route, `${method} ${routePath} route exists`);
  return route[2];
}

function createOperatorRedactionEnv(role = "user") {
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
              if (/FROM\s+sessions\s+s/i.test(sql)) {
                return {
                  session_id: "session-1",
                  user_id: "user-1",
                  username: role,
                  role,
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              return null;
            },
            all: async () => {
              if (/FROM\s+submissions\s+s/i.test(sql)) {
                return {
                  results: [
                    {
                      id: "submission-1",
                      user_id: "user-1",
                      username: "submitter",
                      name: "Submitted Cafe",
                      address: "Seoul",
                      desc: "Coffee",
                      reason: "good",
                      signature: "[]",
                      beanShop: "",
                      instagram: "",
                      category: "[]",
                      status: "approved",
                      reviewed_by: "admin-1",
                      reviewed_by_username: "real-admin",
                      reviewed_at: "2026-05-10T00:00:00.000Z",
                      reject_reason: null,
                      linked_cafe_id: "cafe-1",
                      oakerman_pick: 0,
                      manager_pick: 0,
                      created_at: "2026-05-09T00:00:00.000Z",
                    },
                  ],
                };
              }
              if (/FROM\s+error_reports\s+e/i.test(sql)) {
                return {
                  results: [
                    {
                      id: "report-1",
                      user_id: "user-1",
                      username: "reporter",
                      title: "Bug",
                      page: "mypage",
                      content: "content",
                      status: "resolved",
                      reply_message: "fixed",
                      replied_by: "admin-1",
                      replied_by_username: "real-admin",
                      replied_at: "2026-05-10T00:00:00.000Z",
                      resolved_by: "admin-2",
                      resolved_by_username: "real-admin-2",
                      resolved_at: "2026-05-10T01:00:00.000Z",
                      created_at: "2026-05-09T00:00:00.000Z",
                    },
                  ],
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

async function requestRoute(method, routePath, requestPath, role = "user") {
  const handler = findRoute(method, routePath);
  const { env, statements } = createOperatorRedactionEnv(role);
  const response = await handler(
    new Request(`https://kohee.test${requestPath || routePath}`, {
      method,
      headers: { authorization: "Bearer unit-token" },
    }),
    env,
  );
  return { response, statements, body: await response.json() };
}

const userSubmissions = await requestRoute("GET", "/my-submits");
assert.equal(userSubmissions.response.status, 200);
assert.equal(userSubmissions.body.items[0].reviewed_by, null);
assert.equal(userSubmissions.body.items[0].reviewed_by_username, "운영진");
assert.equal(JSON.stringify(userSubmissions.body).includes("real-admin"), false);

const userReports = await requestRoute("GET", "/my-error-reports");
assert.equal(userReports.response.status, 200);
assert.equal(userReports.body.items[0].replied_by, null);
assert.equal(userReports.body.items[0].replied_by_username, "운영진");
assert.equal(userReports.body.items[0].resolved_by, null);
assert.equal(userReports.body.items[0].resolved_by_username, "운영진");
assert.equal(JSON.stringify(userReports.body).includes("real-admin"), false);

const adminSubmissions = await requestRoute(
  "GET",
  "/submissions",
  "/submissions?status=approved",
  "admin",
);
assert.equal(adminSubmissions.response.status, 200);
assert.equal(adminSubmissions.body.items[0].reviewed_by, "admin-1");
assert.equal(adminSubmissions.body.items[0].reviewed_by_username, "real-admin");

console.log("[operator-redaction] ok");
