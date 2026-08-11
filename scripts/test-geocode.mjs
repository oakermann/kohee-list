import assert from "node:assert/strict";
import { getGeocode } from "../server/favorites.js";
import {
  matchName,
  queryNaver,
  runCandidateCheck,
} from "./check-cafe-candidates.mjs";

// Mock global Request/Response if not present (Node < 18 doesn't have it natively without --experimental-fetch)
// We assume it's available or we can just mock them minimally for this test.
// Wait, test-csv-export uses `new Request`, so it must be available globally.

const originalFetch = global.fetch;

let fetchCallCount = 0;
let fetchLastUrl = null;
let fetchLastOptions = null;
let fetchResponseStatus = 200;
let fetchResponseBody = [
  { lat: "37.123", lon: "127.456", display_name: "Mock Place" },
];

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
    fetchResponseBody = [
      { lat: "37.123", lon: "127.456", display_name: "Mock Place" },
    ];
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

    // 6. Name matching helper
    assert.equal(matchName("Pellucid coffee", "Pellucid  coffee"), true);
    assert.equal(matchName("Pellucid coffee", "Starbucks"), false);
    assert.equal(matchName("GSC", "GSC Global Supply Chain Services"), false);
    assert.equal(matchName("G S C", "GSC"), true);
    assert.equal(matchName("Pellucid", "Pellucid Coffee Roasters"), true);

    // 7. Naver Local API query testing
    // 7a. Missing API credentials return null
    const noKeyHit = await queryNaver({ name: "Pellucid coffee" }, null, null);
    assert.equal(noKeyHit, null);

    // 7b. Valid Naver search response matching candidate
    fetchResponseStatus = 200;
    fetchResponseBody = {
      items: [
        {
          title: "<b>펠루시드커피</b>",
          roadAddress: "서울 서대문구 연희로11가길 483",
          address: "서울 서대문구 연희동 123-4",
          mapx: "1269312340",
          mapy: "375678900",
          link: "https://map.naver.com/p/entry/place/123456",
        },
      ],
    };
    const naverHit = await queryNaver(
      { name: "Pellucid coffee", name_ko: "펠루시드커피" },
      "test-client-id",
      "test-client-secret"
    );
    assert.ok(naverHit);
    assert.equal(naverHit.matchedName, "펠루시드커피");
    assert.equal(naverHit.source, "Naver");
    assert.equal(naverHit.roadAddress, "서울 서대문구 연희로11가길 483");
    assert.equal(naverHit.lat, 37.56789);
    assert.equal(naverHit.lng, 126.931234);
    assert.equal(naverHit.placeUrl, "https://map.naver.com/p/entry/place/123456");
    assert.equal(fetchLastOptions.headers["X-Naver-Client-Id"], "test-client-id");
    assert.equal(fetchLastOptions.headers["X-Naver-Client-Secret"], "test-client-secret");

    // 7c. Naver search response with non-matching name returns null
    fetchResponseBody = {
      items: [
        {
          title: "스타벅스 연희점",
          roadAddress: "서울 서대문구 연희로 100",
          mapx: "1269000000",
          mapy: "375000000",
          link: "https://map.naver.com/p/entry/place/9999",
        },
      ],
    };
    const naverNoMatch = await queryNaver(
      { name: "Pellucid coffee" },
      "test-client-id",
      "test-client-secret"
    );
    assert.equal(naverNoMatch, null);

    // 8. runCandidateCheck missing API key handling
    const savedId = process.env.NAVER_CLIENT_ID;
    const savedSecret = process.env.NAVER_CLIENT_SECRET;
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.NAVER_CLIENT_SECRET;
    const initialExitCode = process.exitCode;
    process.exitCode = 0;

    await runCandidateCheck();
    assert.equal(process.exitCode, 1);
    process.exitCode = initialExitCode;

    if (savedId) process.env.NAVER_CLIENT_ID = savedId;
    if (savedSecret) process.env.NAVER_CLIENT_SECRET = savedSecret;

    console.log("[geocode-unit] ok");
  } finally {
    global.fetch = originalFetch;
  }
}

await run();
