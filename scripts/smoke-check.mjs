// Post-deploy live-site check: pages load, the public list exposes only public columns, admin paths are locked.
//   node scripts/smoke-check.mjs            (default https://kohee.pages.dev)
//   SITE_URL=http://127.0.0.1:8788 node scripts/smoke-check.mjs
import assert from "node:assert/strict";

const SITE = process.env.SITE_URL || "https://kohee.pages.dev";
const PUBLIC_KEYS = [
  "id",
  "name",
  "address",
  "desc",
  "lat",
  "lng",
  "signature",
  "beanShop",
  "instagram",
  "naver_url",
  "region",
  "region_distance_m",
  "category",
  "oakerman_pick",
  "updated_at",
].sort();

async function get(path) {
  // Right after a deploy the old version may show briefly, so ask a few times.
  let last;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    last = await fetch(new URL(path, SITE), { redirect: "follow" });
    if (last.status < 500) return last;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return last;
}

for (const [path, script] of [
  ["/", "index.js"],
  ["/admin", "admin.js"],
  ["/submit", "submit.js"],
  ["/mypage", "mypage.js"],
]) {
  const res = await get(path);
  assert.equal(res.status, 200, `${path} status`);
  assert.ok((await res.text()).includes(script), `${path} serves ${script}`);
}

const data = await get("/api/data");
assert.equal(data.status, 200);
const cafes = await data.json();
assert.ok(Array.isArray(cafes) && cafes.length > 0, "public data has cafes");
for (const cafe of cafes) {
  assert.deepEqual(
    Object.keys(cafe).sort(),
    PUBLIC_KEYS,
    `public keys of ${cafe.id}`,
  );
}

for (const path of [
  "/api/cafes",
  "/api/error-reports",
  "/api/geocode?q=서울",
]) {
  assert.equal((await get(path)).status, 401, `${path} must be admin-only`);
}

console.log(`[smoke] ok ${SITE} (${cafes.length} public cafes)`);
