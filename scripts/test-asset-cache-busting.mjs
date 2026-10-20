import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  checkAssetCacheBusting,
  getAssetVersionsInHtml,
} from "./check-asset-cache-busting.mjs";

export function runAssetCacheBustingTests() {
  console.log("Running asset cache-busting unit tests...");

  // Test 1: Helper function getAssetVersionsInHtml
  {
    const html = `<link rel="stylesheet" href="./assets/base.css?v=20260721-7" /><script src="./assets/index.js?v=20260802-1"></script>`;
    assert.deepEqual(getAssetVersionsInHtml(html, "base.css"), ["20260721-7"]);
    assert.deepEqual(getAssetVersionsInHtml(html, "index.js"), ["20260802-1"]);
    assert.deepEqual(getAssetVersionsInHtml(html, "login.js"), []);
  }

  // Test 2: Asset changed without bump -> FAILS and names asset + html file
  {
    const res = checkAssetCacheBusting({
      git: () => "true",
      baseRef: "MOCK_BASE",
      changedFiles: ["site/assets/index.js"],
      htmlFiles: ["site/index.html"],
      readFile: () => `<script src="./assets/index.js?v=20260722-5"></script>`,
      getBaseFileContent: () => `<script src="./assets/index.js?v=20260722-5"></script>`,
    });

    assert.equal(res.ok, false);
    assert.equal(res.failures.length, 1);
    assert.match(res.failures[0], /assets\/index\.js/);
    assert.match(res.failures[0], /site\/index\.html/);
  }

  // Test 3: Asset changed WITH bump -> PASSES
  {
    const res = checkAssetCacheBusting({
      git: () => "true",
      baseRef: "MOCK_BASE",
      changedFiles: ["site/assets/index.js"],
      htmlFiles: ["site/index.html"],
      readFile: () => `<script src="./assets/index.js?v=20260802-1"></script>`,
      getBaseFileContent: () => `<script src="./assets/index.js?v=20260722-5"></script>`,
    });

    assert.equal(res.ok, true);
    assert.equal(res.failures.length, 0);
  }

  // Test 5: No git history / base -> Skipped graceful no-op
  {
    const res = checkAssetCacheBusting({
      git: (args) => {
        if (args.includes("--is-inside-work-tree")) return "false";
        return null;
      },
    });

    assert.equal(res.ok, true);
    assert.equal(res.skipped, true);
    assert.equal(res.failures.length, 0);
  }

  console.log("Asset cache-busting unit tests passed.");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runAssetCacheBustingTests();
}
