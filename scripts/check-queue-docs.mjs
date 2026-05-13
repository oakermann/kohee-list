#!/usr/bin/env node
import fs from "node:fs";

const files = {
  agents: "AGENTS.md",
  router: "docs/QUEUE_ROUTER.md",
  automationQueue: "docs/queues/AUTOMATION_PLATFORM.md",
  productQueue: "docs/queues/KOHEE_PRODUCT.md",
  localRunbook: "docs/LOCAL_CODEX_RUNBOOK.md",
  workBreakdown: "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
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

const agents = read(files.agents);
const router = read(files.router);
const automationQueue = read(files.automationQueue);
const productQueue = read(files.productQueue);
const localRunbook = read(files.localRunbook);
const workBreakdown = read(files.workBreakdown);
const extraHardening = read(files.extraHardening);
const packageJson = read(files.packageJson);
const verifyRelease = read(files.verifyRelease);

const sharedVocabulary = [
  "Phase 5 bridge",
  "Phase 6A",
  "Phase 6B",
  "Phase 6C",
  "Evidence-based decision system",
  "Supply-chain and CI/CD posture",
  "Recovery and rollback auditability",
  "Protected environment approval gate design",
];

const canonicalPatterns = [
  ["GitHub evidence validator", /GitHub evidence validator/],
  ["MERGE / FIX / HOLD / NEXT", /MERGE \/ FIX \/ HOLD \/ NEXT/],
  ["Evidence-first approval/report format", /Evidence-first owner approval\/report format|Evidence-first approval\/report format/],
  ["Low/medium PR exercise loop", /Low\/medium PR exercise (loop|plan)/],
  ["Dependency-change gate", /Dependency-change gate/],
  ["Lifecycle/install-script policy", /Lifecycle\/install-script policy/],
  ["Lockfile/package-manager-change review", /Lockfile\/package-manager-change review/],
  ["Supply-chain incident freeze mode", /Supply-chain incident freeze mode/],
  ["Rollback note", /Rollback note/],
  ["Last-known-good SHA tracking", /Last-known-good SHA tracking/],
  ["Failed PR and blocked-lane history", /Failed PR[\s\S]{0,40}blocked-lane history|Failed PR history[\s\S]{0,80}Blocked-lane history/],
  ["Automation decision log", /Automation decision log/],
];

// Entrypoint/source-of-truth group.
mustHaveAll("AGENTS", agents, [
  "The active lane is `AUTOMATION_PLATFORM`",
  "docs/QUEUE_ROUTER.md",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md",
  "GitHub evidence wins",
  "Codex self-reports",
  "Automation lane and GitHub evidence reports use:",
  "Status / Blocker / Next action / Evidence",
]);
mustAppearInOrder("AGENTS read path", agents, [
  "## Current routing",
  "## Read path",
  "## Core rules",
  "## Local Codex",
  "## Report format",
]);

mustHaveAll("router", router, [
  "`AUTOMATION_PLATFORM`",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md",
  "Status / Blocker / Next action / Evidence",
]);
mustAppearInOrder("router", router, [
  "## Active lane",
  "## Active execution queue",
  "## Paused product queue",
  "## Supporting automation docs",
]);

// Active queue and work-breakdown must share canonical vocabulary and order.
for (const [label, content] of [
  ["automation queue", automationQueue],
  ["work breakdown", workBreakdown],
]) {
  mustHaveAll(label, content, sharedVocabulary);
  mustAppearInOrder(label, content, [
    "Phase 5 bridge",
    "Phase 6A",
    "Phase 6B",
    "Phase 6C",
  ]);
  for (const [patternLabel, pattern] of canonicalPatterns) {
    mustMatch(label, content, pattern, patternLabel);
  }
}

// Local runbook must follow router and active queue, not legacy queue files.
mustHaveAll("local runbook", localRunbook, [
  "Status: active Phase 5A/5B local execution readiness contract",
  "docs/QUEUE_ROUTER.md",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "Phase 5A worker contract",
  "Task-pick decision table",
  "Phase 5B dry-run picker plan",
  "Dry-run picker steps:",
  "Dry-run picker output table:",
  "Dry-run report template:",
  "Dry-run hard stops:",
  "Stop conditions",
  "Evidence report template",
  "Status / Blocker / Next action / Evidence",
]);
mustAppearInOrder("local runbook", localRunbook, [
  "## Read order",
  "## Phase 5A worker contract",
  "## Task-pick decision table",
  "## Phase 5B dry-run picker plan",
  "## Stop conditions",
  "## Evidence report template",
  "## Operating default",
]);
mustNotHave("local runbook", localRunbook, "Use `docs/KOHEE_ACTIVE_QUEUE.md` as the source of truth.");
mustNotHave("local runbook", localRunbook, "Pick up to 2 independent LOW tasks from `docs/KOHEE_ACTIVE_QUEUE.md`");

// Active queue must point to the current work-breakdown phase names.
mustHaveAll("automation queue", automationQueue, [
  "Purpose: active execution queue for the automation-platform lane.",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "Phase 5B dry-run picker plan is recorded in `docs/LOCAL_CODEX_RUNBOOK.md`.",
  "Phase 5C GitHub evidence validator plan.",
  "Do not resume KOHEE product work unless the maturity gate passes",
  "Do not treat dependency/package changes as LOW by default",
]);
mustAppearInOrder("automation queue execution headings", automationQueue, [
  "### 0. Merge / activate the queue split",
  "### 1. Phase 5 bridge — local execution readiness",
  "### 2. Phase 5 bridge — approval and notification readiness",
  "### 3. Automation Phase 6A — separation foundation",
  "### 4. Automation Phase 6B — harden the separated platform",
  "### 5. Automation Phase 6C — maturity gate",
]);
mustNotHave(
  "automation queue",
  automationQueue,
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 4",
);
mustNotHave("automation queue", automationQueue, "Reference:\n- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 4");

// Work-breakdown must explain that the queue remains the active execution source.
mustHaveAll("work breakdown", workBreakdown, [
  "Source of truth:",
  "docs/QUEUE_ROUTER.md",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "Compatibility note:",
  "Older references to `Phase 4` now map to the current `Phase 5 bridge` section",
  "Phase 5 bridge comes first",
  "This document explains grouping and order; it is not the active queue.",
]);
mustAppearInOrder("work breakdown execution order", workBreakdown, [
  "### Phase 5 bridge: local execution and approval readiness",
  "### Phase 6A: separation foundation",
  "### Phase 6B: harden the separated platform",
  "### Phase 6C: maturity gate",
]);
mustNotHave("work breakdown", workBreakdown, "Stage A comes first");
mustNotHave("work breakdown", workBreakdown, "Stage B comes after Stage A");

// Product queue must remain paused while the automation lane is active.
mustHaveAll("product queue", productQueue, [
  "Paused while the automation-platform lane is active.",
  "docs/queues/AUTOMATION_PLATFORM.md",
  "platform maturity gate",
  "owner explicitly defers the automation lane",
  "Product implementation starts only after project contract and risk policy exist.",
]);

// Extra hardening remains supporting context, not the active execution queue.
mustHave("extra hardening", extraHardening, "automation");
mustNotMatch(
  "extra hardening",
  extraHardening,
  /Purpose:\s*active execution queue/i,
  "active queue purpose",
);
mustNotMatch(
  "extra hardening",
  extraHardening,
  /This is the active queue/i,
  "active queue claim",
);

// The checker must be reachable from project scripts and release verification.
mustMatch(
  "package.json",
  packageJson,
  /"check:queue-docs"\s*:\s*"node scripts\/check-queue-docs\.mjs"/,
  "check:queue-docs script",
);
mustHave("verify-release", verifyRelease, "queue docs consistency");
mustHave("verify-release", verifyRelease, "npm run check:queue-docs");
mustAppearInOrder("verify-release", verifyRelease, [
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
