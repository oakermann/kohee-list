#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function walk(dir, results = []) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return results;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      walk(rel, results);
      continue;
    }
    results.push(rel);
  }
  return results;
}

function assertIncludesAll(label, content, values) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} missing ${value}`);
  }
}

const workflow = read(".github/workflows/kohee-command-dispatch.yml");
const issueTemplate = read(".github/ISSUE_TEMPLATE/kohee_task.md");
const prTemplate = read(".github/pull_request_template.md");
const codexWorkflow = read("docs/CODEX_WORKFLOW.md");
const packageJson = JSON.parse(read("package.json"));

const commandFields = [
  "command_id",
  "state",
  "risk",
  "lane",
  "source",
  "owner",
  "terminal_state",
  "user_action_required",
  "task",
  "acceptance_criteria",
  "allowed_files",
  "denied_files",
  "runtime_change_allowed",
  "do_not_change",
  "high_risk_hold",
  "created_at",
  "last_updated_at",
];

const requiredStates = [
  "QUEUED",
  "QUEUED_STALE",
  "WORKING",
  "PR_OPEN",
  "REVIEWING",
  "FIXING",
  "DEPLOYING",
  "MERGED_AND_DEPLOYED",
  "DONE_NO_DEPLOY",
  "HOLD",
];

const requiredTerminalStates = [
  "MERGED_AND_DEPLOYED",
  "DONE_NO_DEPLOY",
  "HOLD",
];
const requiredRisks = ["LOW", "MEDIUM", "HIGH"];
const requiredLanes = [
  "GOVERNANCE",
  "DEPLOY_SAFETY",
  "PUBLIC_EXPOSURE",
  "AUTH_ROLE",
  "LIFECYCLE",
  "CSV_PIPELINE",
  "FRONTEND_RENDERING",
];
const requiredHolds = [
  "HOLD_HIGH_RISK",
  "HOLD_USER_APPROVAL",
  "HOLD_DEPLOY_BLOCKED",
  "HOLD_SECRET_OR_PERMISSION",
  "HOLD_PRODUCT_DIRECTION",
  "HOLD_SCOPE_CONFLICT",
  "HOLD_VERIFICATION_CONFLICT",
  "HOLD_REPEATED_FAILURE",
  "HOLD_CODEX_NO_RESPONSE",
  "HOLD_CODEX_PR_PUBLISHING",
];

assert.ok(
  workflow.includes("name: KOHEE Command Dispatch"),
  "command dispatch workflow missing",
);
assert.ok(
  workflow.includes("- name: Create KOHEE command issue"),
  "dispatch must stay create-only",
);
assert.equal(
  workflow.includes("github.rest.issues.update"),
  false,
  "dispatch must not update existing command issues",
);
assert.ok(
  workflow.includes("This dispatch is create-only and will not overwrite"),
  "dispatch must explain no-overwrite failure",
);
assert.ok(
  workflow.includes("Manual Codex trigger required"),
  "dispatch must preserve manual Codex trigger guidance",
);
assert.ok(
  workflow.includes("Do not claim PR_OPEN without an actual GitHub PR URL"),
  "dispatch must preserve PR evidence guard guidance",
);

assertIncludesAll("command dispatch workflow", workflow, commandFields);
assertIncludesAll("issue template", issueTemplate, commandFields);
assertIncludesAll("CODEX workflow", codexWorkflow, commandFields);
assertIncludesAll("issue template risk set", issueTemplate, requiredRisks);
assertIncludesAll("issue template lane set", issueTemplate, requiredLanes);
assertIncludesAll("CODEX workflow states", codexWorkflow, requiredStates);
assertIncludesAll(
  "CODEX workflow terminal states",
  codexWorkflow,
  requiredTerminalStates,
);
assertIncludesAll("CODEX workflow HOLD blockers", codexWorkflow, requiredHolds);
assertIncludesAll("PR template evidence fields", prTemplate, [
  "active_pr",
  "head_sha",
  "verification:",
  "evidence:",
  "high_risk_paths_checked",
]);

const testUnit = packageJson.scripts?.["test:unit"] || "";
assert.ok(
  testUnit.includes("scripts/validate-kohee-command.mjs"),
  "test:unit must include the KOHEE command validator",
);

const codeFiles = [
  ...walk(".github/workflows"),
  ...walk("automation"),
  ...walk("scripts"),
].filter((file) => {
  if (file === "scripts/validate-kohee-command.mjs") return false;
  return /\.(ya?ml|mjs|js|cjs|ps1)$/.test(file);
});

const forbiddenStatusApiFragments = [
  "create" + "CommitStatus",
  "/statuses/",
  "repos." + "create" + "CommitStatus",
];

for (const file of codeFiles) {
  const content = read(file);
  for (const fragment of forbiddenStatusApiFragments) {
    assert.equal(
      content.includes(fragment),
      false,
      `${file} must not publish custom commit statuses`,
    );
  }
}

console.log("[kohee-command-validator] ok");
