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

  // Test 2: Asset changed without bump -> FAILS and names asset + html files
  {
    const mockFilesBase = {
      "index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
      ".pages-deploy/index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
    };
    const mockFilesWork = {
      "index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
      ".pages-deploy/index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
    };

    const res = checkAssetCacheBusting({
      git: () => "true",
      baseRef: "MOCK_BASE",
      changedFiles: ["assets/index.js"],
      htmlFiles: ["index.html", ".pages-deploy/index.html"],
      readFile: (file) => mockFilesWork[file] || null,
      getBaseFileContent: (ref, file) => mockFilesBase[file] || null,
    });

    assert.equal(res.ok, false);
    assert.equal(res.failures.length, 1);
    assert.match(res.failures[0], /assets\/index\.js/);
    assert.match(res.failures[0], /index\.html/);
    assert.match(res.failures[0], /\.pages-deploy\/index\.html/);
  }

  // Test 3: Asset changed WITH bump in both copies -> PASSES
  {
    const mockFilesBase = {
      "index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
      ".pages-deploy/index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
    };
    const mockFilesWork = {
      "index.html": `<script src="./assets/index.js?v=20260802-1"></script>`,
      ".pages-deploy/index.html": `<script src="./assets/index.js?v=20260802-1"></script>`,
    };

    const res = checkAssetCacheBusting({
      git: () => "true",
      baseRef: "MOCK_BASE",
      changedFiles: ["assets/index.js"],
      htmlFiles: ["index.html", ".pages-deploy/index.html"],
      readFile: (file) => mockFilesWork[file] || null,
      getBaseFileContent: (ref, file) => mockFilesBase[file] || null,
    });

    assert.equal(res.ok, true);
    assert.equal(res.failures.length, 0);
  }

  // Test 4: Asset changed with bump ONLY in root index.html -> FAILS for .pages-deploy/index.html
  {
    const mockFilesBase = {
      "index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
      ".pages-deploy/index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
    };
    const mockFilesWork = {
      "index.html": `<script src="./assets/index.js?v=20260802-1"></script>`,
      ".pages-deploy/index.html": `<script src="./assets/index.js?v=20260722-5"></script>`,
    };

    const res = checkAssetCacheBusting({
      git: () => "true",
      baseRef: "MOCK_BASE",
      changedFiles: ["assets/index.js"],
      htmlFiles: ["index.html", ".pages-deploy/index.html"],
      readFile: (file) => mockFilesWork[file] || null,
      getBaseFileContent: (ref, file) => mockFilesBase[file] || null,
    });

    assert.equal(res.ok, false);
    assert.equal(res.failures.length, 1);
    assert.match(res.failures[0], /\.pages-deploy\/index\.html/);
    assert.doesNotMatch(res.failures[0], /index\.html,/);
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
