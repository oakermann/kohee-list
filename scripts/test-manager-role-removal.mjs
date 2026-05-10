import assert from "node:assert/strict";

import * as routesModule from "../server/routes.js";

function findRoute(method, path) {
  const route = routesModule.ROUTES.find(
    ([routeMethod, routePath]) => routeMethod === method && routePath === path,
  );
  assert.ok(route, `${method} ${path} route exists`);
  return route[2];
}

function createRouteTestEnv(role = "manager") {
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
                  category: "[]",
                  oakerman_pick: 0,
                  manager_pick: 0,
                  updated_at: "2026-05-10T00:00:00.000Z",
                  status: "candidate",
                  deleted_at: null,
                  hidden_at: null,
                  hidden_by: null,
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

async function requestRoute(method, path, role = "manager") {
  const handler = findRoute(method, path);
  const { env, statements } = createRouteTestEnv(role);
  const response = await handler(
    new Request(`https://kohee.test${path}`, {
      method,
      headers: { authorization: "Bearer unit-token" },
    }),
    env,
  );
  return { response, statements };
}

assert.equal(routesModule.MANAGER_ROUTES, undefined);
assert.ok(Array.isArray(routesModule.ADMIN_OPERATION_ROUTES));
assert.ok(
  routesModule.ADMIN_OPERATION_ROUTES.some(
    ([method, path]) => method === "GET" && path === "/cafes",
  ),
);

const managerCafes = await requestRoute("GET", "/cafes", "manager");
assert.equal(managerCafes.response.status, 403);
assert.equal(
  managerCafes.statements.some((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ),
  false,
);

const userCafes = await requestRoute("GET", "/cafes", "user");
assert.equal(userCafes.response.status, 403);
assert.equal(
  userCafes.statements.some((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ),
  false,
);

const adminCafes = await requestRoute("GET", "/cafes", "admin");
assert.equal(adminCafes.response.status, 200);
assert.equal(
  adminCafes.statements.some((statement) =>
    /SELECT\s+id,\s+name,\s+address/i.test(statement.sql),
  ),
  true,
);

console.log("[manager-role-removal] ok");
