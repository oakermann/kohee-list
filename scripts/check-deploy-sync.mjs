import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { checkAssetCacheBusting } from "./check-asset-cache-busting.mjs";
import { runAssetCacheBustingTests } from "./test-asset-cache-busting.mjs";

const files = [
  "index.html",
  "admin.html",
  "login.html",
  "submit.html",
  "mypage.html",
  "privacy.html",
  "assets/common.js",
  "assets/index.js",
  // "assets/admin.js",
  "assets/login.js",
  "assets/submit.js",
  "assets/mypage.js",
  "assets/base.css",
  "assets/admin.css",
  "assets/index.css",
  "assets/login.css",
  "assets/submit.css",
  "assets/mypage.css",
  "assets/privacy.css",
];

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

async function readNormalized(filePath) {
  const content = await readFile(filePath, "utf8");
  return normalizeNewlines(content);
}

const failures = [];

for (const file of files) {
  const rootPath = path.join(process.cwd(), file);
  const deployPath = path.join(process.cwd(), ".pages-deploy", file);

  let rootContent = "";
  let deployContent = "";

  try {
    rootContent = await readNormalized(rootPath);
  } catch (error) {
    failures.push(`Missing: ${file}`);
    continue;
  }

  try {
    deployContent = await readNormalized(deployPath);
  } catch (error) {
    failures.push(`Missing: .pages-deploy/${file}`);
    continue;
  }

  if (rootContent !== deployContent) {
    failures.push(`Mismatch: ${file} <-> .pages-deploy/${file}`);
  }
}

try {
  runAssetCacheBustingTests();
} catch (testErr) {
  console.error("Asset cache-busting unit tests failed:", testErr);
  failures.push(`Asset cache-busting test failure: ${testErr.message}`);
}

const cacheBustResult = checkAssetCacheBusting();
if (cacheBustResult.skipped) {
  console.log(`[check-asset-cache-busting] Skipped: ${cacheBustResult.reason}`);
} else if (!cacheBustResult.ok) {
  for (const failure of cacheBustResult.failures) {
    failures.push(failure);
  }
} else {
  console.log("Asset cache-busting check passed.");
}

if (failures.length) {
  console.error("Deploy sync check failed.");
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("Deploy sync check passed.");
}
