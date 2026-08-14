import assert from "node:assert";
import { readFile } from "node:fs/promises";
import {
  compareContent,
  extractVersionedAssetRefs,
  verifyLiveAssets,
} from "./check-live-assets.mjs";

console.log("[test-live-assets] Running live asset check unit assertions...");

// 0. Pure comparison helper tests
{
  // Identical bodies pass
  const sameRes = compareContent("index.html", "hello world\n", "hello world\n");
  assert.strictEqual(sameRes.ok, true, "Identical bodies must pass");
  assert.strictEqual(sameRes.liveLen, 12);
  assert.strictEqual(sameRes.localLen, 12);
  assert.strictEqual(sameRes.liveShortHash, sameRes.localShortHash);

  // Differing bodies fail
  const diffRes = compareContent("index.html", "hello live\n", "hello repo\n");
  assert.strictEqual(diffRes.ok, false, "Differing bodies must fail");
  assert.ok(diffRes.error.includes("index.html"), "Error must state path");
  assert.ok(diffRes.error.includes("live length"), "Error must state live length");
  assert.ok(diffRes.error.includes("repo length"), "Error must state repo length");
  assert.ok(diffRes.error.includes(diffRes.liveShortHash), "Error must state live short hash");
  assert.ok(diffRes.error.includes(diffRes.localShortHash), "Error must state repo short hash");

  // Missing local file fails
  const missingRes = compareContent("index.html", "hello live\n", null);
  assert.strictEqual(missingRes.ok, false, "Missing local file must fail");
  assert.ok(missingRes.error.includes("index.html"), "Error must state path");
  assert.ok(missingRes.error.includes("does not exist"), "Error must state file missing");
}

// 1. Test asset reference extraction from HTML
{
  const html = `
    <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/font.css" />
        <link rel="stylesheet" href="./assets/base.css?v=20260721-7" />
        <link rel="stylesheet" href="/assets/index.css?v=20260721-11" />
      </head>
      <body>
        <script type="module" src="./assets/index.js?v=20260802-1"></script>
        <script src="./assets/no-version.js"></script>
      </body>
    </html>
  `;
  const refs = extractVersionedAssetRefs(html, "https://test.site/index.html");
  assert.strictEqual(refs.length, 3, "Should extract 3 versioned local assets");
  assert.strictEqual(refs[0].relativePath, "assets/base.css");
  assert.strictEqual(
    refs[0].liveUrl,
    "https://test.site/assets/base.css?v=20260721-7",
  );
  assert.strictEqual(refs[1].relativePath, "assets/index.css");
  assert.strictEqual(refs[2].relativePath, "assets/index.js");
}

// 2. Test matching pair passes
{
  const indexHtml = await readFile(".pages-deploy/index.html", "utf8");
  const mockFetch = async (url) => {
    if (url === "https://test.site/index.html") {
      return {
        ok: true,
        status: 200,
        text: async () => indexHtml,
      };
    }
    if (url.includes("assets/")) {
      const assetUrl = new URL(url);
      const relPath = assetUrl.pathname.replace(/^\//, "");
      const text = await readFile(`.pages-deploy/${relPath}`, "utf8");
      return {
        ok: true,
        status: 200,
        text: async () => text,
      };
    }
    return { ok: false, status: 404, text: async () => "Not found" };
  };

  const res = await verifyLiveAssets({
    origin: "https://test.site",
    fetchFn: mockFetch,
    pages: ["index.html"],
  });

  assert.strictEqual(res.ok, true, "Matching asset content must pass check");
  assert.strictEqual(res.failures.length, 0);
  assert.ok(res.checkedCount >= 1, "Should check HTML and assets");
}

// 3. Test mismatched asset fails and identifies the asset (The 2026-08-02 failure scenario)
{
  const indexHtml = await readFile(".pages-deploy/index.html", "utf8");
  const mockFetch = async (url) => {
    if (url === "https://test.site/index.html") {
      return {
        ok: true,
        status: 200,
        text: async () => indexHtml,
      };
    }
    if (url.includes("assets/")) {
      return {
        ok: true,
        status: 200,
        text: async () => `console.log("OLD ASSET CONTENT FROM CACHE");`,
      };
    }
    return { ok: false, status: 404, text: async () => "Not found" };
  };

  const res = await verifyLiveAssets({
    origin: "https://test.site",
    fetchFn: mockFetch,
    pages: ["index.html"],
  });

  assert.strictEqual(res.ok, false, "Mismatched asset content must fail check");
  assert.ok(res.failures.length >= 1);
  assert.ok(
    res.failures.some((f) => f.includes("assets/") && f.includes("Content mismatch")),
    "Failure message must state which asset failed",
  );
}

// 4. Test unreachable site fails cleanly
{
  const mockFetch = async () => {
    throw new TypeError("fetch failed");
  };

  const res = await verifyLiveAssets({
    origin: "https://unreachable.site",
    fetchFn: mockFetch,
    pages: ["index.html"],
  });

  assert.strictEqual(res.ok, false, "Unreachable site must fail check");
  assert.ok(
    res.failures[0].includes("unreachable") ||
      res.failures[0].includes("fetch failed") ||
      res.failures[0].includes("Unreachable"),
    "Failure message must indicate site is unreachable",
  );
}

// 5. Test live asset HTTP 404 fails
{
  const indexHtml = await readFile(".pages-deploy/index.html", "utf8");
  const mockFetch = async (url) => {
    if (url === "https://test.site/index.html") {
      return {
        ok: true,
        status: 200,
        text: async () => indexHtml,
      };
    }
    return { ok: false, status: 404, text: async () => "404 Not Found" };
  };

  const res = await verifyLiveAssets({
    origin: "https://test.site",
    fetchFn: mockFetch,
    pages: ["index.html"],
  });

  assert.strictEqual(res.ok, false, "Live asset 404 must fail check");
  assert.ok(
    res.failures.some((f) => f.includes("404")),
    "Failure message must mention HTTP 404",
  );
}

console.log("[test-live-assets] All assertions passed cleanly!");
