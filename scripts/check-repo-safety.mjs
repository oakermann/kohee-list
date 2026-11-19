import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const dangerousExtensions = new Set([
  ".backup",
  ".bak",
  ".db",
  ".db3",
  ".dump",
  ".sqlite",
  ".sqlite3",
]);

const ignoredDirectories = new Set([
  ".git",
  ".wrangler",
  "backups",
  "node_modules",
  "reports",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function getCandidateFilesFromGit() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function walkFiles(directory, prefix = "") {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      files.push(toPosix(relativePath));
    }
  }

  return files;
}

function getCandidateFiles() {
  try {
    return getCandidateFilesFromGit();
  } catch {
    return walkFiles(repoRoot);
  }
}

function isAllowedSqlPath(filePath) {
  return (
    filePath === "schema.sql" ||
    filePath.startsWith("migrations/") ||
    filePath.startsWith("schema/") ||
    filePath.startsWith("tests/fixtures/") ||
    filePath.startsWith("fixtures/")
  );
}

function isDangerousBackupPath(filePath) {
  const normalized = filePath.toLowerCase();
  const extension = path.posix.extname(normalized);

  if (dangerousExtensions.has(extension)) {
    return true;
  }

  if (extension === ".sql" && !isAllowedSqlPath(filePath)) {
    return true;
  }

  if (
    (normalized.includes("/backup") ||
      normalized.includes("/backups/") ||
      normalized.includes("/dump") ||
      normalized.includes("/dumps/")) &&
    [".csv", ".json", ".sql", ".txt"].includes(extension)
  ) {
    return true;
  }

  return false;
}

const candidates = getCandidateFiles();
const blocked = candidates.filter(isDangerousBackupPath).sort();

if (blocked.length > 0) {
  console.error("Repo safety check failed.");
  console.error("Backup or database dump-like files must not be committed:");
  for (const filePath of blocked) {
    console.error(`- ${filePath}`);
  }
  console.error("");
  console.error("Move D1 backups outside the repo, for example:");
  console.error("F:\\KOHEE-LIST\\backups\\d1\\");
  console.error("");
  console.error(
    "Allowed SQL paths: schema.sql, migrations/**, schema/**, fixtures.",
  );
  process.exit(1);
}

console.log("Repo safety check passed.");
