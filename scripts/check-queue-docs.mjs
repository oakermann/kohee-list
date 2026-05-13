#!/usr/bin/env node
import fs from "node:fs";

const files = {
  agents: "AGENTS.md",
  router: "docs/QUEUE_ROUTER.md",
  operatorRail: "docs/AUTOMATION_OPERATOR_RAIL.md",
  automationQueue: "docs/queues/AUTOMATION_PLATFORM.md",
  productQueue: "docs/queues/KOHEE_PRODUCT.md",
  localRunbook: "docs/LOCAL_CODEX_RUNBOOK.md",
  workBreakdown: "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  enterpriseHardening: "docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md",
  trustPolicyApproval: "docs/AUTOMATION_PLATFORM_6B1_TRUST_POLICY_APPROVAL.md",
  eventWorkerLease: "docs/AUTOMATION_PLATFORM_6B2_EVENT_WORKER_LEASE.md",
  supplyChainCi: "docs/AUTOMATION_PLATFORM_6B3_SUPPLY_CHAIN_CI.md",
  recoveryRollback: "docs/AUTOMATION_PLATFORM_6B4_RECOVERY_ROLLBACK.md",
  observabilityControlBoard: "docs/AUTOMATION_PLATFORM_6B5_OBSERVABILITY_CONTROL_BOARD.md",
  budgetRetryMaturityPrep: "docs/AUTOMATION_PLATFORM_6B6_BUDGET_RETRY_MATURITY_PREP.md",
  maturityGate: "docs/AUTOMATION_PLATFORM_6C_MATURITY_GATE.md",
  extraHardening: "docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md",
  packageJson: "package.json",
  verifyRelease: "scripts/verify-release.ps1",
};

const errors = [];

function read(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    errors.push(`missing file: ${path}`);
    return "";
  }
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function fail(message) {
  errors.push(message);
  console.log(`FAIL: ${message}`);
}

function mustHave(label, content, text) {
  if (content.includes(text)) ok(`${label}: ${text}`);
  else fail(`${label} missing: ${text}`);
}

function mustNotHave(label, content, text) {
  if (content.includes(text)) fail(`${label} has stale text: ${text}`);
  else ok(`${label}: no stale ${text}`);
}

function mustMatch(label, content, regex, message) {
  if (regex.test(content)) ok(`${label}: ${message}`);
  else fail(`${label} missing pattern: ${message}`);
}

function mustNotMatch(label, content, regex, message) {
  if (regex.test(content)) fail(`${label} has stale pattern: ${message}`);
  else ok(`${label}: no stale pattern ${message}`);
}

function mustAppearInOrder(label, content, items) {
  let searchFrom = 0;
  for (const item of items) {
    const index = content.indexOf(item, searchFrom);
    if (index === -1) {
      fail(`${label} missing ordered item after index ${searchFrom}: ${item}`);
      return;
    }
    searchFrom = index + item.length;
  }
  ok(`${label}: ordered items match`);
}

function mustHaveAll(label, content, items) {
  for (const item of items) mustHave(label, content, item);
}

const docs = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

mustHaveAll("AGENTS", docs.agents, [
  "The active lane is `AUTOMATION_PLATFORM`",
  "docs/QUEUE_ROUTER.md",
  "docs/AUTOMATION_OPERATOR_RAIL.md",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "GitHub evidence wins",
  "Codex self-reports",
  "Status / Blocker / Next action / Evidence",
]);
mustAppearInOrder("AGENTS read path", docs.agents, [
  "## Current routing",
  "## Read path",
  "## Core rules",
  "## Local Codex",
  "## Report format",
]);

mustHaveAll("router", docs.router, [
  "`AUTOMATION_PLATFORM`",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md",
  "Status / Blocker / Next action / Evidence",
]);

mustHaveAll("operator rail", docs.operatorRail, [
  "Automation Operator Rail",
  "active operator rail",
  "진행",
  "Codex must read the repo rail",
  "Open PR exists",
  "Required check failed",
  "Unresolved review thread exists",
  "LOW/MEDIUM",
  "HIGH/HOLD",
  "Codex does not merge",
  "User says 진행 -> Codex works -> ChatGPT checks -> User approves merge",
]);
mustAppearInOrder("operator rail", docs.operatorRail, [
  "## Roles",
  "## Command contract",
  "## Codex read order",
  "## Task selection rule",
  "## Restricted work",
  "## Required Codex output",
  "## Merge rule",
  "## One-run boundary",
  "## Main workflow",
]);

mustHaveAll("automation queue", docs.automationQueue, [
  "Purpose: active execution queue for the automation-platform lane.",
  "docs/AUTOMATION_OPERATOR_RAIL.md",
  "Automation operator rail path",
  "Use the operator rail.",
  "Codex should:",
  "ChatGPT should:",
  "docs/queues/KOHEE_PRODUCT.md",
  "Status / Blocker / Next action / Evidence",
]);
mustNotHave("automation queue", docs.automationQueue, "Stage A comes first");
mustNotHave("automation queue", docs.automationQueue, "Stage B comes after Stage A");

mustHaveAll("local runbook", docs.localRunbook, [
  "docs/QUEUE_ROUTER.md",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "Phase 5A worker contract",
  "Phase 5B dry-run picker plan",
  "Phase 5C GitHub evidence validator plan",
  "Phase 5D low/medium PR exercise loop plan",
  "Phase 5E approval and notification readiness",
  "Status / Blocker / Next action / Evidence",
]);
mustNotHave("local runbook", docs.localRunbook, "Use `docs/KOHEE_ACTIVE_QUEUE.md` as the source of truth.");

mustHaveAll("work breakdown", docs.workBreakdown, [
  "Source of truth:",
  "docs/QUEUE_ROUTER.md",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "Phase 5 bridge comes first",
  "This document explains grouping and order; it is not the active queue.",
  "Phase 6A separation foundation contract",
  "Phase 6B lane split",
]);

mustHaveAll("enterprise hardening", docs.enterpriseHardening, [
  "Automation Platform Enterprise Hardening Map",
  "Enterprise gap inventory",
  "6B-1 trust-policy-approval",
  "6B-2 event-worker-lease",
  "6B-3 supply-chain-ci",
  "6B-4 recovery-rollback",
  "6B-5 observability-control-board",
  "6B-6 budget-retry-maturity-prep",
]);

const contractDocs = [
  ["trust policy approval", docs.trustPolicyApproval, "Phase 6B-1 Trust Policy Approval Contract"],
  ["event worker lease", docs.eventWorkerLease, "Phase 6B-2 Event Worker Lease Contract"],
  ["supply chain ci", docs.supplyChainCi, "Phase 6B-3 Supply Chain CI Contract"],
  ["recovery rollback", docs.recoveryRollback, "Phase 6B-4 Recovery Rollback Contract"],
  ["observability control board", docs.observabilityControlBoard, "Phase 6B-5 Observability Control Board Contract"],
  ["budget retry maturity prep", docs.budgetRetryMaturityPrep, "Phase 6B-6 Budget Retry Maturity Prep Contract"],
  ["maturity gate", docs.maturityGate, "Phase 6C Maturity Gate"],
];

for (const [label, content, title] of contractDocs) {
  mustHave(label, content, title);
  mustHave(label, content, "Completion criteria");
}

mustHaveAll("product queue", docs.productQueue, [
  "Paused while the automation-platform lane is active.",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "platform maturity gate",
  "owner explicitly defers the automation lane",
  "Product implementation starts only after project contract and risk policy exist.",
]);

mustHave("extra hardening", docs.extraHardening, "automation");
mustNotMatch("extra hardening", docs.extraHardening, /Purpose:\s*active execution queue/i, "active queue purpose");
mustNotMatch("extra hardening", docs.extraHardening, /This is the active queue/i, "active queue claim");

mustMatch(
  "package.json",
  docs.packageJson,
  /"check:queue-docs"\s*:\s*"node scripts\/check-queue-docs\.mjs"/,
  "check:queue-docs script",
);
mustHave("verify-release", docs.verifyRelease, "queue docs consistency");
mustHave("verify-release", docs.verifyRelease, "npm run check:queue-docs");
mustAppearInOrder("verify-release", docs.verifyRelease, [
  "deploy source sync",
  "queue docs consistency",
  "unit tests",
  "syntax checks",
  "repo safety",
]);

if (errors.length) {
  console.log(`\nResult: FAIL (${errors.length} queue/doc issue(s))`);
  process.exit(1);
}

console.log("\nResult: PASS queue/doc consistency");
