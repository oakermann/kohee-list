import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ORIGIN =
  process.env.PAGES_URL ||
  process.env.SITE_ORIGIN ||
  "https://kohee.pages.dev";

const DEFAULT_PAGES = [
  "index.html",
  "admin.html",
  "login.html",
  "submit.html",
  "mypage.html",
  "privacy.html",
];

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function sha256Hex(content) {
  const normalized = normalizeNewlines(content);
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Pure comparison helper that compares live body against repo deploy mirror body.
 * Returns { ok: true, ... } on match or { ok: false, error: ... } on mismatch or missing file.
 */
export function compareContent(relPath, liveContent, localContent) {
  if (localContent === null || localContent === undefined) {
    return {
      ok: false,
      relPath,
      error: `File "${relPath}" does not exist in repository deploy mirror (.pages-deploy)`,
    };
  }

  const normLive = normalizeNewlines(liveContent);
  const normLocal = normalizeNewlines(localContent);

  const liveHash = sha256Hex(normLive);
  const localHash = sha256Hex(normLocal);

  const liveLen = normLive.length;
  const localLen = normLocal.length;

  const liveShortHash = liveHash.slice(0, 8);
  const localShortHash = localHash.slice(0, 8);

  if (liveHash !== localHash) {
    return {
      ok: false,
      relPath,
      liveLen,
      localLen,
      liveShortHash,
      localShortHash,
      error: `Content mismatch for "${relPath}": live length ${liveLen} (${liveShortHash}) != repo length ${localLen} (${localShortHash})`,
    };
  }

  return {
    ok: true,
    relPath,
    liveLen,
    localLen,
    liveShortHash,
    localShortHash,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 10000, fetchFn = globalThis.fetch, ...fetchOpts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      ...fetchOpts,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw new Error(
      `Unreachable site or network error fetching ${url}: ${err.message}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function extractVersionedAssetRefs(html, pageUrl) {
  const refs = [];
  const attrRegex = /(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    if (!rawUrl || !rawUrl.includes("?v=")) {
      continue;
    }

    let resolvedUrl;
    try {
      resolvedUrl = new URL(rawUrl, pageUrl);
    } catch {
      continue;
    }

    const pathname = resolvedUrl.pathname;
    const relativePath = pathname.replace(/^\//, "");

    if (relativePath.startsWith("assets/")) {
      refs.push({
        rawUrl,
        liveUrl: resolvedUrl.toString(),
        relativePath,
      });
    }
  }

  return refs;
}

export async function verifyLiveAssets(options = {}) {
  const rawOrigin =
    options.origin ||
    process.env.PAGES_URL ||
    process.env.SITE_ORIGIN ||
    DEFAULT_ORIGIN;

  const origin = rawOrigin.replace(/\/+$/, "");
  const rootDir = options.rootDir || process.cwd();
  const deployDir = options.deployDir || path.join(rootDir, ".pages-deploy");
  const fetchFn = options.fetchFn || globalThis.fetch;
  const pages = options.pages || DEFAULT_PAGES;
  const timeoutMs = options.timeoutMs || 10000;

  const failures = [];
  const checked = [];

  const assetMap = new Map();

  // Legitimate dynamic differences: None exist for static HTML pages (index.html, admin.html, etc.)
  // or static assets (assets/*.js, assets/*.css) served via Cloudflare Pages.
  // API routes (/api/*) are handled by Cloudflare Functions/Workers, but static assets and HTML pages
  // under .pages-deploy are served as exact static files. Therefore, no dynamic content ignores
  // or tolerances are added.

  for (const page of pages) {
    const pageRelPath = page.replace(/^\//, "");
    const pageUrl = `${origin}/${pageRelPath}`;
    const localFilePath = path.join(deployDir, pageRelPath);

    let localContent = null;
    if (existsSync(localFilePath)) {
      try {
        localContent = await readFile(localFilePath, "utf8");
      } catch (err) {
        failures.push(
          `Failed to read repository deploy mirror file "${pageRelPath}": ${err.message}`,
        );
        continue;
      }
    }

    let res;
    try {
      res = await fetchWithTimeout(pageUrl, { fetchFn, timeoutMs });
    } catch (error) {
      failures.push(
        `Site unreachable when fetching live page "${pageRelPath}" (${pageUrl}): ${error.message}`,
      );
      return {
        ok: false,
        origin,
        checkedCount: 0,
        checked,
        failures,
      };
    }

    if (!res.ok) {
      failures.push(
        `Failed to fetch live page "${pageRelPath}" (${pageUrl}): HTTP ${res.status}`,
      );
      continue;
    }

    const liveContent = await res.text();

    const pageCmp = compareContent(pageRelPath, liveContent, localContent);
    if (!pageCmp.ok) {
      failures.push(pageCmp.error);
    } else {
      checked.push({
        relativePath: pageRelPath,
        liveUrl: pageUrl,
        hash: pageCmp.liveShortHash,
      });
    }

    const refs = extractVersionedAssetRefs(liveContent, pageUrl);
    for (const ref of refs) {
      if (!assetMap.has(ref.liveUrl)) {
        assetMap.set(ref.liveUrl, {
          relativePath: ref.relativePath,
          pages: new Set([pageRelPath]),
        });
      } else {
        assetMap.get(ref.liveUrl).pages.add(pageRelPath);
      }
    }
  }

  for (const [liveUrl, info] of assetMap.entries()) {
    const relativePath = info.relativePath;
    const pageList = Array.from(info.pages).join(", ");
    const localFilePath = path.join(deployDir, relativePath);

    let localContent = null;
    if (existsSync(localFilePath)) {
      try {
        localContent = await readFile(localFilePath, "utf8");
      } catch (err) {
        failures.push(
          `Failed to read repository deploy mirror file "${relativePath}": ${err.message}`,
        );
        continue;
      }
    }

    let assetRes;
    try {
      assetRes = await fetchWithTimeout(liveUrl, { fetchFn, timeoutMs });
    } catch (error) {
      failures.push(
        `Failed to fetch live asset "${relativePath}" (${liveUrl}) referenced in (${pageList}): ${error.message}`,
      );
      continue;
    }

    if (!assetRes.ok) {
      failures.push(
        `Live asset "${relativePath}" (${liveUrl}) referenced in (${pageList}) returned HTTP ${assetRes.status}`,
      );
      continue;
    }

    const liveContent = await assetRes.text();
    const assetCmp = compareContent(relativePath, liveContent, localContent);

    if (!assetCmp.ok) {
      failures.push(
        `Asset (referenced in live ${pageList}): ${assetCmp.error}`,
      );
    } else {
      checked.push({
        relativePath,
        liveUrl,
        pages: Array.from(info.pages),
        hash: assetCmp.liveShortHash,
      });
    }
  }

  return {
    ok: failures.length === 0,
    origin,
    checkedCount: checked.length,
    checked,
    failures,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/check-live-assets.mjs [--url <origin>] [--origin <origin>] [<origin>]

Options:
  --url, --origin  Target site origin URL (default: PAGES_URL env var or https://kohee.pages.dev)
  --help           Show this help message.
`);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  let origin;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg.startsWith("--url=")) {
      origin = arg.slice(6);
    } else if (arg === "--url" && process.argv[i + 1]) {
      origin = process.argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--origin=")) {
      origin = arg.slice(9);
    } else if (arg === "--origin" && process.argv[i + 1]) {
      origin = process.argv[i + 1];
      i += 1;
    } else if (!arg.startsWith("-") && !origin) {
      origin = arg;
    }
  }

  try {
    const result = await verifyLiveAssets({ origin });
    if (!result.ok) {
      for (const failure of result.failures) {
        console.error(failure);
      }
      process.exitCode = 1;
    }
    // Silence on success per requirements
  } catch (error) {
    console.error(`[check-live-assets] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
