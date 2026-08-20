import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const targetDir = path.join(rootDir, ".pages-deploy");

// 1. Delete existing .pages-deploy directory if present
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// 2. Copy root HTML pages
const entries = fs.readdirSync(rootDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith(".html")) {
    fs.copyFileSync(path.join(rootDir, entry.name), path.join(targetDir, entry.name));
  }
}

// 3. Copy _headers
const headersPath = path.join(rootDir, "_headers");
if (fs.existsSync(headersPath)) {
  fs.copyFileSync(headersPath, path.join(targetDir, "_headers"));
}

// 4. Copy assets/ directory recursively
const assetsPath = path.join(rootDir, "assets");
if (fs.existsSync(assetsPath)) {
  fs.cpSync(assetsPath, path.join(targetDir, "assets"), { recursive: true });
}

// 5. Copy functions/ directory recursively
const functionsPath = path.join(rootDir, "functions");
if (fs.existsSync(functionsPath)) {
  fs.cpSync(functionsPath, path.join(targetDir, "functions"), { recursive: true });
}

// 6. Compare against committed copy in git
let statusOutput = "";
try {
  statusOutput = execSync("git status --porcelain --untracked-files=all .pages-deploy", {
    encoding: "utf8",
    cwd: rootDir,
  }).trim();
} catch (error) {
  console.error("Failed to run git status to check .pages-deploy against committed copy:", error.message);
  process.exit(1);
}

if (statusOutput) {
  const lines = statusOutput.split("\n").map((line) => line.trim()).filter(Boolean);
  console.error("Build output differs from committed copy:");
  for (const line of lines) {
    const file = line.replace(/^[\s?MADRCU]{1,2}\s+/, "");
    console.error(`  Differing file: ${file}`);
  }
  process.exit(1);
}

console.log("Built .pages-deploy successfully. All files match committed copy byte-for-byte.");
