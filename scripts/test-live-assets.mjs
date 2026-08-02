import assert from "node:assert";
import { readFile } from "node:fs/promises";
import {
  extractVersionedAssetRefs,
  verifyLiveAssets,
} from "./check-live-assets.mjs";

console.log("[test-live-assets] Running live asset check unit assertions...");

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
  const mockFetch = async (url) => {
    if (url === "https://test.site/index.html") {
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<script src="./assets/index.js?v=20260802-1"></script>`,
      };
    }
    if (url === "https://test.site/assets/index.js?v=20260802-1") {
      const text = await readFile("assets/index.js", "utf8");
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
  assert.strictEqual(res.checkedCount, 1);
}

// 3. Test mismatched pair fails and identifies the asset (The 2026-08-02 failure scenario)
{
  const mockFetch = async (url) => {
    if (url === "https://test.site/index.html") {
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<script src="./assets/index.js?v=20260721-1"></script>`,
      };
    }
    if (url === "https://test.site/assets/index.js?v=20260721-1") {
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
  assert.strictEqual(res.failures.length, 1);
  assert.ok(
    res.failures[0].includes("assets/index.js"),
    "Failure message must state which asset failed",
  );
  assert.ok(
    res.failures[0].includes("Content mismatch"),
    "Failure message must mention Content mismatch",
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
      res.failures[0].includes("fetch failed"),
    "Failure message must indicate site is unreachable",
  );
}

// 5. Test live asset HTTP 404 fails
{
  const mockFetch = async (url) => {
    if (url === "https://test.site/index.html") {
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<script src="./assets/index.js?v=20260802-1"></script>`,
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
    res.failures[0].includes("404"),
    "Failure message must mention HTTP 404",
  );
}

console.log("[test-live-assets] All assertions passed cleanly!");
