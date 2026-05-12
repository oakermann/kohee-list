#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

const workflow = read(".github/workflows/maintenance-scheduled.yml");
const packageJson = JSON.parse(read("package.json"));
const activeQueue = read("docs/KOHEE_ACTIVE_QUEUE.md");
const auditLog = read("docs/audits/LOCAL_CODEX_AUDIT_LOG.md");

const forbiddenWorkflowFragments = [
  "issues: write",
  "github.rest.issues.create",
  "github.rest.issues.createComment",
  "github.rest.issues.update",
  "actions/upload-artifact",
  "scripts\\auto-maintenance.ps1",
  "scripts/auto-maintenance.ps1",
  "export-csv.ps1",
  "wrangler d1 execute",
];

for (const fragment of forbiddenWorkflowFragments) {
  assert.equal(
    workflow.includes(fragment),
    false,
    `maintenance scheduled workflow must stay read-only: ${fragment}`,
  );
}

assert.ok(
  workflow.includes("permissions:") && workflow.includes("contents: read"),
  "maintenance scheduled workflow must declare read-only contents permission",
);
assert.ok(
  workflow.includes("actions: read"),
  "maintenance scheduled workflow must keep actions read permission only",
);
assert.ok(
  workflow.includes("npm run audit:maintenance"),
  "maintenance scheduled workflow must run the read-only maintenance audit",
);

const testUnit = packageJson.scripts?.["test:unit"] || "";
assert.ok(
  packageJson.scripts?.["audit:maintenance"] ===
    "node scripts/audit-maintenance-readonly.mjs",
  "package.json must expose audit:maintenance",
);
assert.ok(
  testUnit.includes("scripts/audit-maintenance-readonly.mjs"),
  "test:unit must include read-only maintenance audit",
);

assert.ok(
  activeQueue.includes("read-only maintenance audit"),
  "ACTIVE_QUEUE should track read-only maintenance audit state",
);
assert.ok(
  auditLog.includes("Read-only maintenance audit"),
  "LOCAL_CODEX_AUDIT_LOG should record read-only maintenance audit work",
);

const requiredFiles = [
  "docs/KOHEE_MASTER_CONTEXT.md",
  "kohee.contract.json",
  "docs/CODEX_AUTOMATION_STATUS.md",
  "docs/CODEX_WORKFLOW.md",
  "docs/KOHEE_ACTIVE_QUEUE.md",
  "docs/audits/KOHEE_FINDINGS.md",
  ".github/workflows/pr-validate.yml",
  ".github/workflows/validate.yml",
  ".github/workflows/maintenance-scheduled.yml",
  "scripts/audit-kohee.mjs",
  "scripts/validate-kohee-command.mjs",
];

for (const file of requiredFiles) {
  assert.ok(exists(file), `required maintenance audit input missing: ${file}`);
}

const summary = {
  ok: true,
  mode: "read-only",
  checks: [
    "maintenance workflow has no issue writes",
    "maintenance workflow has no CSV export backup",
    "maintenance workflow has no artifact upload",
    "maintenance workflow runs audit:maintenance",
    "test:unit includes audit-maintenance-readonly",
    "required governance inputs exist",
  ],
};

console.log("[maintenance-readonly-audit] ok");
console.log(JSON.stringify(summary));
