import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function git(args, options = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      ...options,
    }).trim();
  } catch {
    return null;
  }
}

export function getAssetVersionsInHtml(htmlContent, assetFileName) {
  if (!htmlContent || !assetFileName) return [];
  const escaped = assetFileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `(?:(?:\\./|/)?assets/|\\./)?${escaped}\\?v=([^"'\\s>]+)`,
    "g"
  );
  const versions = [];
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    versions.push(match[1]);
  }
  return versions;
}

export function checkAssetCacheBusting(options = {}) {
  const cwd = options.cwd || process.cwd();

  const gitFn = options.git || ((args) => git(args, { cwd }));
  const readFileFn =
    options.readFile ||
    ((filePath) => {
      try {
        return fs.readFileSync(path.join(cwd, filePath), "utf8");
      } catch {
        return null;
      }
    });
  const getBaseFileContentFn =
    options.getBaseFileContent ||
    ((baseRef, filePath) => {
      return gitFn(["show", `${baseRef}:${filePath}`]);
    });

  const isGitRepo = gitFn(["rev-parse", "--is-inside-work-tree"]);
  if (isGitRepo !== "true") {
    return {
      ok: true,
      skipped: true,
      reason: "Not a git repository",
      failures: [],
    };
  }

  let baseRef = options.baseRef || null;
  if (!baseRef) {
    baseRef = gitFn(["merge-base", "HEAD", "origin/main"]);
    if (!baseRef) {
      baseRef = gitFn(["merge-base", "HEAD", "main"]);
    }
    if (!baseRef) {
      baseRef = gitFn(["rev-parse", "HEAD^"]);
    }
  }

  if (!baseRef) {
    return {
      ok: true,
      skipped: true,
      reason: "No git history or base reference found to compare against",
      failures: [],
    };
  }

  let changedFiles = options.changedFiles || null;
  if (!changedFiles) {
    const trackedOutput = gitFn(["diff", "--name-only", baseRef, "--"]) || "";
    const tracked = trackedOutput
      .split(/\r?\n/)
      .map((s) => s.trim().replace(/\\/g, "/"))
      .filter(Boolean);

    const untrackedOutput =
      gitFn(["ls-files", "--others", "--exclude-standard"]) || "";
    const untracked = untrackedOutput
      .split(/\r?\n/)
      .map((s) => s.trim().replace(/\\/g, "/"))
      .filter(Boolean);

    changedFiles = Array.from(new Set([...tracked, ...untracked]));
  }

  const changedAssetMap = new Map();
  for (const file of changedFiles) {
    const norm = file.replace(/\\/g, "/");
    if (norm.startsWith("assets/") || norm.startsWith(".pages-deploy/assets/")) {
      const fileName = path.basename(norm);
      if (!changedAssetMap.has(fileName)) {
        changedAssetMap.set(fileName, `assets/${fileName}`);
      }
    }
  }

  if (changedAssetMap.size === 0) {
    return {
      ok: true,
      skipped: false,
      reason: "No assets changed",
      failures: [],
    };
  }

  let htmlFiles = options.htmlFiles || null;
  if (!htmlFiles) {
    const standardHtmlNames = [
      "index.html",
      "admin.html",
      "login.html",
      "mypage.html",
      "privacy.html",
      "submit.html",
    ];
    htmlFiles = [
      ...standardHtmlNames,
      ...standardHtmlNames.map((name) => `.pages-deploy/${name}`),
    ];
  }

  const failures = [];

  for (const [assetFileName, canonicalAssetPath] of changedAssetMap.entries()) {
    const unbumpedHtmlFiles = [];

    for (const htmlFile of htmlFiles) {
      const baseContent = getBaseFileContentFn(baseRef, htmlFile) || "";
      const workContent = readFileFn(htmlFile) || "";

      const baseVersions = getAssetVersionsInHtml(baseContent, assetFileName);
      const workVersions = getAssetVersionsInHtml(workContent, assetFileName);

      if (baseVersions.length > 0 || workVersions.length > 0) {
        const unchanged =
          baseVersions.length === workVersions.length &&
          baseVersions.every((v, i) => v === workVersions[i]);

        if (unchanged) {
          unbumpedHtmlFiles.push(htmlFile);
        }
      }
    }

    if (unbumpedHtmlFiles.length > 0) {
      failures.push(
        `Asset changed without cache-busting bump: ${canonicalAssetPath} (unbumped references in: ${unbumpedHtmlFiles.join(", ")})`
      );
    }
  }

  return {
    ok: failures.length === 0,
    skipped: false,
    failures,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = checkAssetCacheBusting();
  if (result.skipped) {
    console.log(`[check-asset-cache-busting] Skipped: ${result.reason}`);
    process.exitCode = 0;
  } else if (!result.ok) {
    console.error("Asset cache-busting check failed.");
    for (const failure of result.failures) {
      console.error(`  - ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Asset cache-busting check passed.");
  }
}
