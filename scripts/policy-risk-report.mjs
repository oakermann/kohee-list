import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BUCKETS = [
  "HIGH/HOLD candidate",
  "MEDIUM+ candidate",
  "LOW candidate",
  "unmatched/unknown",
];

const HIGH_HOLD_RULES = [
  {
    area: "D1/schema/migrations",
    matches: (file) =>
      file === "schema.sql" ||
      file.startsWith("schema/") ||
      file.startsWith("d1/") ||
      file.startsWith("migrations/") ||
      file.includes("/schema/") ||
      file.includes("/d1/") ||
      file.includes("/migrations/"),
  },
  {
    area: "auth/session/security",
    matches: (file) =>
      /^server\/(auth|session|security|users)\.js$/.test(file) ||
      /^server\/.*(auth|session|security).*\.(js|mjs|cjs)$/.test(file),
  },
  {
    area: "CSV import/reset",
    matches: (file) =>
      file === "server/csv.js" ||
      /(^|\/)(import|reset)[-_]?csv/i.test(file) ||
      /(^|\/)csv[-_]?(import|reset)/i.test(file),
  },
  {
    area: "public /data behavior",
    matches: (file) =>
      file === "worker.js" ||
      /^server\/(cafes|favorites|routes)\.js$/.test(file),
  },
  {
    area: "workflow/deploy/credential",
    matches: (file) =>
      file.startsWith(".github/workflows/") ||
      /(^|\/)wrangler(\..*)?\.toml$/i.test(file) ||
      /(^|\/)\.env(\.|$)/i.test(file) ||
      /(^|\/).*(secret|credential|token|private[-_]?key).*/i.test(file) ||
      /\.(pem|key|p12|pfx)$/i.test(file) ||
      /^scripts\/(deploy|release|sync-pages)/i.test(file),
  },
];

const MEDIUM_RULES = [
  {
    area: "package/lockfile/install-script",
    matches: (file) =>
      file === "package.json" ||
      file === "package-lock.json" ||
      file === "npm-shrinkwrap.json" ||
      file === "pnpm-lock.yaml" ||
      file === "yarn.lock" ||
      file === "bun.lockb" ||
      file === ".npmrc" ||
      /^scripts\/.*install.*\.(js|mjs|cjs|ps1|sh|cmd|bat)$/i.test(file),
  },
];

function isDocPath(file) {
  return (
    file === "AGENTS.md" ||
    file === "README.md" ||
    file.startsWith("docs/") ||
    file.endsWith(".md")
  );
}

export function normalizePath(file) {
  return String(file || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

function uniqueFiles(files) {
  return [...new Set(files.map(normalizePath).filter(Boolean))];
}

function changedFilesFromOutput(output) {
  return uniqueFiles(String(output || "").split(/\r?\n/));
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return "";
  }
}

function currentBranchName() {
  return tryGit(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
}

function mainLikeBranch(branch) {
  return branch === "main" || branch === "master";
}

function workingTreeChangedFiles() {
  const tracked = changedFilesFromOutput(
    git(["diff", "--name-only", "HEAD", "--"]),
  );
  const untracked = changedFilesFromOutput(
    git(["ls-files", "--others", "--exclude-standard"]),
  );
  return uniqueFiles([...tracked, ...untracked]);
}

function envComparisonChangedFiles() {
  const base =
    process.env.POLICY_RISK_BASE_SHA ||
    process.env.BASE_SHA ||
    process.env.GITHUB_BASE_SHA ||
    "";
  const head =
    process.env.POLICY_RISK_HEAD_SHA ||
    process.env.HEAD_SHA ||
    process.env.GITHUB_SHA ||
    "HEAD";

  if (!base) return [];
  return changedFilesFromOutput(
    tryGit(["diff", "--name-only", base, head, "--"]),
  );
}

function githubEventComparisonChangedFiles() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return [];

  try {
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    const base = event?.pull_request?.base?.sha || "";
    const head = event?.pull_request?.head?.sha || "";
    if (!base || !head) return [];
    return changedFilesFromOutput(
      tryGit(["diff", "--name-only", base, head, "--"]),
    );
  } catch {
    return [];
  }
}

function branchComparisonChangedFiles() {
  const branch = currentBranchName();
  if (!branch || mainLikeBranch(branch)) return [];

  const baseRef =
    tryGit(["rev-parse", "--verify", "origin/main"]).trim() ||
    tryGit(["rev-parse", "--verify", "origin/master"]).trim();
  if (!baseRef) return [];

  const mergeBase = tryGit(["merge-base", baseRef, "HEAD"]).trim();
  if (!mergeBase) return [];

  return changedFilesFromOutput(
    tryGit(["diff", "--name-only", mergeBase, "HEAD", "--"]),
  );
}

function lastCommitChangedFiles() {
  const branch = currentBranchName();
  if (mainLikeBranch(branch)) return [];

  return changedFilesFromOutput(
    tryGit([
      "diff-tree",
      "--no-commit-id",
      "--name-only",
      "-r",
      "-m",
      "HEAD",
    ]),
  );
}

export function getGitChangedFiles() {
  const strategies = [
    workingTreeChangedFiles,
    envComparisonChangedFiles,
    githubEventComparisonChangedFiles,
    branchComparisonChangedFiles,
    lastCommitChangedFiles,
  ];

  for (const strategy of strategies) {
    const files = strategy();
    if (files.length > 0) {
      return files;
    }
  }

  return [];
}

export function classifyFile(file) {
  const normalized = normalizePath(file);

  for (const rule of HIGH_HOLD_RULES) {
    if (rule.matches(normalized)) {
      return {
        file: normalized,
        bucket: "HIGH/HOLD candidate",
        area: rule.area,
      };
    }
  }

  for (const rule of MEDIUM_RULES) {
    if (rule.matches(normalized)) {
      return {
        file: normalized,
        bucket: "MEDIUM+ candidate",
        area: rule.area,
      };
    }
  }

  if (isDocPath(normalized)) {
    return {
      file: normalized,
      bucket: "LOW candidate",
      area: "docs-only",
    };
  }

  return {
    file: normalized,
    bucket: "unmatched/unknown",
    area: "no v1 path rule matched",
  };
}

export function classifyFiles(files, options = {}) {
  const changedFiles = uniqueFiles(files);
  const findings = changedFiles.map(classifyFile);
  const buckets = Object.fromEntries(BUCKETS.map((bucket) => [bucket, []]));

  for (const finding of findings) {
    buckets[finding.bucket].push(finding);
  }

  const overall =
    buckets["HIGH/HOLD candidate"].length > 0
      ? "HIGH/HOLD candidate"
      : buckets["MEDIUM+ candidate"].length > 0
        ? "MEDIUM+ candidate"
        : buckets["unmatched/unknown"].length > 0
          ? "unmatched/unknown"
          : buckets["LOW candidate"].length > 0
            ? "LOW candidate"
            : "none";

  return {
    source: options.source || "explicit file list",
    gitError: options.gitError || "",
    changedFiles,
    buckets,
    overall,
    reportOnly: true,
  };
}

function formatBucket(bucket, findings) {
  const lines = [`${bucket}:`];
  if (findings.length === 0) {
    lines.push("  (none)");
    return lines;
  }

  for (const finding of findings) {
    lines.push(`  - ${finding.file} (${finding.area})`);
  }
  return lines;
}

export function formatReport(report) {
  const lines = [
    "Policy risk report (report-only)",
    `Source: ${report.source}`,
    `Changed files: ${report.changedFiles.length}`,
    `Overall candidate: ${report.overall}`,
    "Blocking: no; this checker always exits 0 in report-only mode.",
  ];

  if (report.gitError) {
    lines.push(`Git detection warning: ${report.gitError}`);
  }

  lines.push("");
  lines.push("Buckets:");
  for (const bucket of BUCKETS) {
    lines.push(...formatBucket(bucket, report.buckets[bucket]));
  }

  return `${lines.join("\n")}\n`;
}

function reportFromCli(argv) {
  const explicitFiles = uniqueFiles(argv);
  if (explicitFiles.length > 0) {
    return classifyFiles(explicitFiles, { source: "explicit file list" });
  }

  try {
    return classifyFiles(getGitChangedFiles(), { source: "git changed files" });
  } catch (error) {
    return classifyFiles([], {
      source: "git changed files",
      gitError: error instanceof Error ? error.message : String(error),
    });
  }
}

const entrypoint = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";
const currentFile = fileURLToPath(import.meta.url);

if (entrypoint === currentFile) {
  const report = reportFromCli(process.argv.slice(2));
  process.stdout.write(formatReport(report));
}
