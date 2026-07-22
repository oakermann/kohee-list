import assert from "node:assert/strict";
import { getGeocode } from "../server/favorites.js";

// Mock global Request/Response if not present (Node < 18 doesn't have it natively without --experimental-fetch)
// We assume it's available or we can just mock them minimally for this test.
// Wait, test-csv-export uses `new Request`, so it must be available globally.

const originalFetch = global.fetch;

let fetchCallCount = 0;
let fetchLastUrl = null;
let fetchLastOptions = null;
let fetchResponseStatus = 200;
let fetchResponseBody = [{ lat: "37.123", lon: "127.456", display_name: "Mock Place" }];

global.fetch = async (url, options) => {
  fetchCallCount++;
  fetchLastUrl = url;
  fetchLastOptions = options;
  return {
    ok: fetchResponseStatus === 200,
    json: async () => fetchResponseBody,
  };
};

function createEnv() {
  return {}; // getGeocode doesn't strict require DB or secrets
}

async function run() {
  try {
    // 1. Valid request
    fetchResponseStatus = 200;
    fetchResponseBody = [{ lat: "37.123", lon: "127.456", display_name: "Mock Place" }];
    const req1 = new Request("https://kohee.test/geocode?q=seoul");
    const res1 = await getGeocode(req1, createEnv());
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.lat, 37.123);
    assert.equal(body1.lng, 127.456);
    assert.equal(body1.label, "Mock Place");
    assert.equal(fetchLastOptions.headers["User-Agent"], "kohee-list/1.0");
    assert.ok(fetchLastUrl.includes("q=seoul"));
    assert.ok(fetchLastUrl.includes("countrycodes=kr"));

    // 2. Query too short
    const req2 = new Request("https://kohee.test/geocode?q=a");
    const res2 = await getGeocode(req2, createEnv());
    assert.equal(res2.status, 400);

    // 3. Query too long
    const longQ = "a".repeat(81);
    const req3 = new Request(`https://kohee.test/geocode?q=${longQ}`);
    const res3 = await getGeocode(req3, createEnv());
    assert.equal(res3.status, 400);

    // 4. Not Found (404 from upstream)
    fetchResponseStatus = 404;
    const req4 = new Request("https://kohee.test/geocode?q=nowhere");
    const res4 = await getGeocode(req4, createEnv());
    assert.equal(res4.status, 404);

    // 5. Empty results from upstream
    fetchResponseStatus = 200;
    fetchResponseBody = [];
    const req5 = new Request("https://kohee.test/geocode?q=empty");
    const res5 = await getGeocode(req5, createEnv());
    assert.equal(res5.status, 404);

    console.log("[geocode-unit] ok");
  } finally {
    global.fetch = originalFetch;
  }
}

await run();
