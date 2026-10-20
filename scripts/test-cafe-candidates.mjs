import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildReport,
  matchName,
  queryNaver,
  runCandidateCheck,
} from "./check-cafe-candidates.mjs";

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
    status: fetchResponseStatus,
    json: async () => fetchResponseBody,
  };
};

async function run() {
  try {
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
      "test-client-secret",
    );
    assert.ok(naverHit);
    assert.equal(naverHit.matchedName, "펠루시드커피");
    assert.equal(naverHit.source, "Naver");
    assert.equal(naverHit.roadAddress, "서울 서대문구 연희로11가길 483");
    assert.equal(naverHit.lat, 37.56789);
    assert.equal(naverHit.lng, 126.931234);
    assert.equal(
      naverHit.placeUrl,
      "https://map.naver.com/p/entry/place/123456",
    );
    assert.equal(
      fetchLastOptions.headers["X-Naver-Client-Id"],
      "test-client-id",
    );
    assert.equal(
      fetchLastOptions.headers["X-Naver-Client-Secret"],
      "test-client-secret",
    );

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
      "test-client-secret",
    );
    assert.equal(naverNoMatch, null);

    // 7d. Non-ok response puts candidate under Could Not Check
    fetchResponseStatus = 500;
    const naverServerError = await queryNaver(
      { name: "Pellucid coffee" },
      "test-client-id",
      "test-client-secret",
    );
    assert.ok(naverServerError);
    assert.equal(typeof naverServerError.error, "string");
    assert.ok(naverServerError.error.includes("500"));

    // 7e. Completed empty response still reads Not Found
    fetchResponseStatus = 200;
    fetchResponseBody = { items: [] };
    const naverEmptyResult = await queryNaver(
      { name: "Pellucid coffee" },
      "test-client-id",
      "test-client-secret",
    );
    assert.equal(naverEmptyResult, null);

    // 7f. Report generation: non-ok response puts candidate under could-not-check heading
    const failedReport = buildReport({
      candidatesCount: 1,
      found: [],
      doubtful: [],
      couldNotCheck: [
        {
          name: "Pellucid coffee",
          expectedRegion: "Seodaemun-gu Yeonhui-dong",
          error: "HTTP 500 Internal Server Error",
        },
      ],
      notFound: [],
    });
    assert.ok(failedReport.includes("## Could Not Check"));
    assert.ok(failedReport.includes("- Could Not Check: 1"));
    assert.ok(failedReport.includes("- Not Found: 0"));
    assert.ok(failedReport.includes("Pellucid coffee"));
    assert.ok(failedReport.includes("incomplete"));
    assert.ok(failedReport.includes("must not be read as a verdict"));
    assert.equal(failedReport.includes("## Not Found\nNone."), true);

    // 7g. Report generation: completed empty response still reads Not Found
    const emptyReport = buildReport({
      candidatesCount: 1,
      found: [],
      doubtful: [],
      couldNotCheck: [],
      notFound: [
        {
          name: "Pellucid coffee",
          expectedRegion: "Seodaemun-gu Yeonhui-dong",
        },
      ],
    });
    assert.ok(emptyReport.includes("## Not Found"));
    assert.ok(emptyReport.includes("- Not Found: 1"));
    assert.ok(emptyReport.includes("- Could Not Check: 0"));
    assert.ok(emptyReport.includes("Pellucid coffee"));
    assert.equal(emptyReport.includes("incomplete"), false);
    assert.equal(emptyReport.includes("## Could Not Check\nNone."), true);

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

    // 8b. runCandidateCheck with non-ok response writes Could Not Check report
    const reportPath = path.join(
      process.cwd(),
      "docs",
      "cafe-candidate-report.md",
    );
    const originalReportContent = await fs.readFile(reportPath, "utf8");

    try {
      process.env.NAVER_CLIENT_ID = "test-client-id";
      process.env.NAVER_CLIENT_SECRET = "test-client-secret";
      fetchResponseStatus = 500;

      await runCandidateCheck();

      const generatedReport = await fs.readFile(reportPath, "utf8");
      assert.ok(generatedReport.includes("## Could Not Check"));
      assert.ok(generatedReport.includes("- Could Not Check: 14"));
      assert.ok(generatedReport.includes("- Not Found: 0"));
      assert.ok(generatedReport.includes("must not be read as a verdict"));
    } finally {
      await fs.writeFile(reportPath, originalReportContent, "utf8");
      if (savedId) process.env.NAVER_CLIENT_ID = savedId;
      else delete process.env.NAVER_CLIENT_ID;
      if (savedSecret) process.env.NAVER_CLIENT_SECRET = savedSecret;
      else delete process.env.NAVER_CLIENT_SECRET;
    }

    console.log("[cafe-candidates] ok");
  } finally {
    global.fetch = originalFetch;
  }
}

await run();
