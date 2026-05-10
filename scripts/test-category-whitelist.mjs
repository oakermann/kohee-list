import assert from "node:assert/strict";

import { normalizeCafePayload, parseCafeCategories } from "../server/cafes.js";

assert.deepEqual(parseCafeCategories(["espresso", "drip", "decaf"]), [
  "espresso",
  "drip",
  "decaf",
]);
assert.deepEqual(parseCafeCategories("espresso, dessert|instagram"), [
  "espresso",
  "dessert",
  "instagram",
]);
assert.throws(
  () => parseCafeCategories(["espresso", "invalid-category"]),
  /Invalid category value/,
);

const validPayload = normalizeCafePayload(
  {
    name: "Category Cafe",
    address: "Seoul",
    desc: "Coffee",
    category: ["espresso", "dessert"],
    signature: ["espresso"],
  },
  "admin",
);
assert.equal(validPayload.category, '["espresso","dessert"]');

assert.throws(
  () =>
    normalizeCafePayload(
      {
        name: "Invalid Category Cafe",
        address: "Seoul",
        desc: "Coffee",
        category: ["espresso", "tea"],
      },
      "admin",
    ),
  /Invalid category value/,
);

assert.throws(
  () =>
    normalizeCafePayload(
      {
        name: "Invalid Category Submission",
        address: "Seoul",
        desc: "Coffee",
        category: "drip,not-allowed",
      },
      "manager",
    ),
  /Invalid category value/,
);

console.log("[category-whitelist-unit] ok");
