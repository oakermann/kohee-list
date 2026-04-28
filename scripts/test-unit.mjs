import assert from "node:assert/strict";

import {
  applyPickPermission,
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

console.log("[unit] ok");
