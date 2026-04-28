import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import process from "node:process";

const FRONTEND_FILES = new Set([
  "index.html",
  "admin.html",
  "login.html",
  "submit.html",
  "mypage.html",
]);

const TOOLING_FILES = new Set([
  "package.json",
  "package-lock.json",
  ".prettierrc",
  ".prettierignore",
]);

const D1_MANUAL_REVIEW_REASON = "D1 migration requires manual review.";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function isZeroSha(value) {
  return /^0{40}$/.test(String(value || ""));
}

function normalizePath(file) {
  return file.replace(/\\/g, "/").replace(/^\.\//, "");
}

function changedFilesFromOutput(output) {
  return output
    .split(/\r?\n/)
    .map((line) => normalizePath(line.trim()))
    .filter(Boolean);
}

function fallbackBase(head) {
  try {
    return git(["rev-parse", `${head}^`]);
  } catch {
    return "";
  }
}

function getChangedFiles() {
  if (hasArg("--working-tree")) {
    const tracked = changedFilesFromOutput(
      git(["diff", "--name-only", "HEAD", "--"]),
    );
    const untracked = changedFilesFromOutput(
      git(["ls-files", "--others", "--exclude-standard"]),
    );
    return [...new Set([...tracked, ...untracked])];
  }

  const head = argValue("--head") || process.env.HEAD_SHA || "HEAD";
  let base = argValue("--base") || process.env.BASE_SHA || "";

  if (!base || isZeroSha(base)) {
    base = fallbackBase(head);
  }

  if (!base) {
    return changedFilesFromOutput(
      git(["diff-tree", "--no-commit-id", "--name-only", "-r", head]),
    );
  }

  return changedFilesFromOutput(git(["diff", "--name-only", base, head, "--"]));
}

function isFrontend(file) {
  return (
    FRONTEND_FILES.has(file) ||
    file.startsWith("assets/") ||
    file.startsWith(".pages-deploy/")
  );
}

function isWorker(file) {
  return (
    file === "worker.js" ||
    file.startsWith("server/") ||
    file === "wrangler.toml"
  );
}

function isD1(file) {
  return (
    file.startsWith("migrations/") ||
    file.startsWith("schema/") ||
    file.startsWith("d1/") ||
    file === "schema.sql" ||
    file.endsWith(".sql")
  );
}

function isDocs(file) {
  return (
    file === "README.md" || file.startsWith("docs/") || file.endsWith(".md")
  );
}

function isWorkflow(file) {
  return file.startsWith(".github/workflows/");
}

function isTooling(file) {
  return TOOLING_FILES.has(file) || file.startsWith("scripts/");
}

function writeGithubOutputs(result) {
  if (!process.env.GITHUB_OUTPUT) return;

  const lines = [];
  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value)) {
      lines.push(`${key}=${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

let changedFiles = [];

try {
  changedFiles = getChangedFiles();
} catch (error) {
  const result = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    changedFiles: [],
    frontendChanged: false,
    workerChanged: false,
    d1Changed: false,
    docsOnlyChanged: false,
    workflowChanged: false,
    toolingChanged: false,
    shouldDeployPages: false,
    shouldDeployWorker: false,
    shouldBlockAutoDeployDueToD1: false,
    manualMigrationRequired: false,
    skipReason: "Changed-area detection failed; auto deploy disabled.",
  };

  writeGithubOutputs(result);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 1;
}

if (process.exitCode) {
  process.exit();
}

const frontendChanged = changedFiles.some(isFrontend);
const workerChanged = changedFiles.some(isWorker);
const d1Changed = changedFiles.some(isD1);
const workflowChanged = changedFiles.some(isWorkflow);
const toolingChanged = changedFiles.some(isTooling);
const docsOnlyChanged = changedFiles.length > 0 && changedFiles.every(isDocs);
const onlyWorkflowOrTooling =
  changedFiles.length > 0 &&
  changedFiles.every(
    (file) => isWorkflow(file) || isTooling(file) || isDocs(file),
  );

let skipReason = "";
if (changedFiles.length === 0) {
  skipReason = "No changed files detected.";
} else if (d1Changed) {
  skipReason = D1_MANUAL_REVIEW_REASON;
} else if (docsOnlyChanged) {
  skipReason = "Documentation-only change.";
} else if (onlyWorkflowOrTooling && !frontendChanged && !workerChanged) {
  skipReason = "Workflow/tooling-only change.";
}

const shouldDeployPages = frontendChanged && !d1Changed && !docsOnlyChanged;
const shouldDeployWorker = workerChanged && !d1Changed && !docsOnlyChanged;

function deploySkipReason(kind) {
  if (d1Changed) return D1_MANUAL_REVIEW_REASON;
  if (kind === "pages" && shouldDeployPages) return "not skipped";
  if (kind === "worker" && shouldDeployWorker) return "not skipped";
  if (changedFiles.length === 0) return "No changed files detected.";
  if (docsOnlyChanged) return "Documentation-only change.";
  if (onlyWorkflowOrTooling && !frontendChanged && !workerChanged) {
    return "Workflow/tooling-only change.";
  }
  if (kind === "pages") return "No frontend deploy source changes.";
  return "No worker/server changes.";
}

const smokeCheckPlan = d1Changed
  ? `skipped - ${D1_MANUAL_REVIEW_REASON}`
  : shouldDeployPages || shouldDeployWorker
    ? [
        shouldDeployPages ? "Pages smoke check after Pages deploy" : "",
        shouldDeployWorker ? "Worker health check after Worker deploy" : "",
      ]
        .filter(Boolean)
        .join("; ")
    : "skipped - no deployment performed";

const result = {
  ok: true,
  changedFiles,
  frontendChanged,
  workerChanged,
  d1Changed,
  docsOnlyChanged,
  workflowChanged,
  toolingChanged,
  shouldDeployPages,
  shouldDeployWorker,
  shouldBlockAutoDeployDueToD1: d1Changed,
  manualMigrationRequired: d1Changed,
  pagesSkipReason: deploySkipReason("pages"),
  workerSkipReason: deploySkipReason("worker"),
  smokeCheckPlan,
  skipReason,
};

writeGithubOutputs(result);
console.log(JSON.stringify(result, null, 2));
