#!/usr/bin/env node
import fs from "node:fs";

const files = {
  agents: "AGENTS.md",
  router: "docs/QUEUE_ROUTER.md",
  automationQueue: "docs/queues/AUTOMATION_PLATFORM.md",
  productQueue: "docs/queues/KOHEE_PRODUCT.md",
  localRunbook: "docs/LOCAL_CODEX_RUNBOOK.md",
  workBreakdown: "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  enterpriseHardening: "docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md",
  trustPolicyApproval: "docs/AUTOMATION_PLATFORM_6B1_TRUST_POLICY_APPROVAL.md",
  eventWorkerLease: "docs/AUTOMATION_PLATFORM_6B2_EVENT_WORKER_LEASE.md",
  supplyChainCi: "docs/AUTOMATION_PLATFORM_6B3_SUPPLY_CHAIN_CI.md",
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
const enterpriseHardening = read(files.enterpriseHardening);
const trustPolicyApproval = read(files.trustPolicyApproval);
const eventWorkerLease = read(files.eventWorkerLease);
const supplyChainCi = read(files.supplyChainCi);
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

const phase6AItems = [
  "Phase 6A separation foundation contract",
  "Boundary table:",
  "Automation status schema draft:",
  "Task intake schema draft:",
  "State transition policy:",
  "Project registry manifest draft:",
  "Project catalog metadata draft:",
  "Backlog separation rule:",
  "Repo split preparation:",
  "Shared template seed plan:",
  "Project onboarding checklist:",
  "Golden path scaffolding design:",
];

const phase6BItems = [
  "Phase 6B lane split",
  "Lane table:",
  "`6B-1 trust-policy-approval`",
  "`6B-2 event-worker-lease`",
  "`6B-3 supply-chain-ci`",
  "`6B-4 recovery-rollback`",
  "`6B-5 observability-control-board`",
  "`6B-6 budget-retry-maturity-prep`",
  "Lane rules:",
  "Recommended merge order:",
  "Parallel eligibility:",
];

const enterpriseGapItems = [
  "Automation Platform Enterprise Hardening Map",
  "Enterprise gap inventory",
  "DORA / delivery metrics",
  "Automation SLO / stuck detection",
  "Policy-as-code enforcement",
  "Release artifact provenance",
  "Cloudflare rollback / deployment runbook",
  "Browser smoke / E2E",
  "Secrets / OIDC / least privilege",
  "Dependency / third-party risk scoring",
  "Threat modeling / prompt injection defense",
  "Immutable audit / evidence archive",
  "Incident response / postmortem",
  "Config / infra drift detection",
  "Cost / quota guardrail",
  "Docs simplification",
  "Reusable template extraction",
  "Branch protection / ruleset inventory",
  "Data classification / privacy inventory",
  "D1 backup / restore drill",
  "Release notes / changelog automation",
  "Customer impact / maintenance process",
  "Lane absorption plan",
  "6B-1 trust-policy-approval",
  "6B-2 event-worker-lease",
  "6B-3 supply-chain-ci",
  "6B-4 recovery-rollback",
  "6B-5 observability-control-board",
  "6B-6 budget-retry-maturity-prep",
  "Minimum Phase 6B completion expectation",
];

const trustPolicyApprovalItems = [
  "Phase 6B-1 Trust Policy Approval Contract",
  "Trust boundary",
  "Prompt-injection and instruction override defense",
  "Policy-as-code direction",
  "Approval ledger design",
  "Owner override protocol",
  "Protected environment approval gate",
  "RACI-style role split",
  "Data classification direction",
  "ADR policy",
  "Completion criteria",
];

const eventWorkerLeaseItems = [
  "Phase 6B-2 Event Worker Lease Contract",
  "Event intake boundary",
  "Webhook idempotency design",
  "Task lease model",
  "Heartbeat and stuck detection",
  "Retry and rate-limit policy",
  "Reusable workflow baseline",
  "Future worker states",
  "Fallback path",
  "Completion criteria",
];

const supplyChainCiItems = [
  "Phase 6B-3 Supply Chain CI Contract",
  "Secrets and permission inventory",
  "Workflow permission review",
  "Branch protection and ruleset inventory",
  "Third-party action risk scoring",
  "Dependency risk scoring",
  "Build provenance and artifact attestation readiness",
  "Config and infra drift audit",
  "Incident freeze mode",
  "Completion criteria",
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
  "Status: active Phase 5A/5B/5C/5D/5E local execution readiness contract",
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
  "Phase 5C GitHub evidence validator plan",
  "Required evidence inputs:",
  "Validation steps:",
  "Decision rules:",
  "Evidence validator report template:",
  "Validator hard stops:",
  "Phase 5D low/medium PR exercise loop plan",
  "Allowed exercise PRs:",
  "Forbidden exercise PRs:",
  "Exercise loop steps for each PR:",
  "Exercise result ledger template:",
  "Completion criteria:",
  "Phase 5E approval and notification readiness",
  "Approval notification bridge:",
  "Owner approval pack template:",
  "Native auto-merge approval pack:",
  "Local controlled worker loop approval pack:",
  "Notification readiness hard stops:",
  "Stop conditions",
  "Evidence report template",
  "Status / Blocker / Next action / Evidence",
]);
mustAppearInOrder("local runbook", localRunbook, [
  "## Read order",
  "## Phase 5A worker contract",
  "## Task-pick decision table",
  "## Phase 5B dry-run picker plan",
  "## Phase 5C GitHub evidence validator plan",
  "## Phase 5D low/medium PR exercise loop plan",
  "## Phase 5E approval and notification readiness",
  "## Stop conditions",
  "## Evidence report template",
  "## Operating default",
]);
mustNotHave("local runbook", localRunbook, "Use `docs/KOHEE_ACTIVE_QUEUE.md` as the source of truth.");
mustNotHave("local runbook", localRunbook, "Pick up to 2 independent LOW tasks from `docs/KOHEE_ACTIVE_QUEUE.md`");

// Phase 6A separation foundation must be recorded in the work breakdown.
mustHaveAll("work breakdown Phase 6A", workBreakdown, phase6AItems);
mustAppearInOrder("work breakdown Phase 6A contract", workBreakdown, [
  "### Phase 6A: separation foundation",
  "#### Phase 6A separation foundation contract",
  "Boundary table:",
  "Automation status schema draft:",
  "Task intake schema draft:",
  "State transition policy:",
  "Project registry manifest draft:",
  "Project catalog metadata draft:",
  "Backlog separation rule:",
  "Repo split preparation:",
  "Shared template seed plan:",
  "Project onboarding checklist:",
  "Golden path scaffolding design:",
]);

// Phase 6B lane split must be recorded in the work breakdown.
mustHaveAll("work breakdown Phase 6B", workBreakdown, phase6BItems);
mustAppearInOrder("work breakdown Phase 6B lane split", workBreakdown, [
  "### Phase 6B: harden the separated platform",
  "#### Phase 6B lane split",
  "Lane table:",
  "Lane rules:",
  "Recommended merge order:",
  "Parallel eligibility:",
]);

// Enterprise hardening map must preserve the searched operating-gap inventory.
mustHaveAll("enterprise hardening", enterpriseHardening, enterpriseGapItems);
mustHave("enterprise hardening", enterpriseHardening, "docs/AUTOMATION_PLATFORM_6B1_TRUST_POLICY_APPROVAL.md");
mustHave("enterprise hardening", enterpriseHardening, "docs/AUTOMATION_PLATFORM_6B2_EVENT_WORKER_LEASE.md");
mustHave("enterprise hardening", enterpriseHardening, "docs/AUTOMATION_PLATFORM_6B3_SUPPLY_CHAIN_CI.md");
mustAppearInOrder("enterprise hardening", enterpriseHardening, [
  "## Enterprise gap inventory",
  "## Lane absorption plan",
  "### 6B-1 trust-policy-approval",
  "### 6B-2 event-worker-lease",
  "### 6B-3 supply-chain-ci",
  "### 6B-4 recovery-rollback",
  "### 6B-5 observability-control-board",
  "### 6B-6 budget-retry-maturity-prep",
  "## Enterprise hardening execution rules",
  "## Minimum Phase 6B completion expectation",
]);

// Phase 6B-1 trust/policy/approval contract must remain complete.
mustHaveAll("trust policy approval", trustPolicyApproval, trustPolicyApprovalItems);
mustAppearInOrder("trust policy approval", trustPolicyApproval, [
  "## 1. Trust boundary",
  "## 2. Prompt-injection and instruction override defense",
  "## 3. Policy-as-code direction",
  "## 4. Approval ledger design",
  "## 5. Owner override protocol",
  "## 6. Protected environment approval gate",
  "## 7. RACI-style role split",
  "## 8. Data classification direction",
  "## 9. ADR policy",
  "## 10. Completion criteria",
]);

// Phase 6B-2 event/worker/lease contract must remain complete.
mustHaveAll("event worker lease", eventWorkerLease, eventWorkerLeaseItems);
mustAppearInOrder("event worker lease", eventWorkerLease, [
  "## 1. Event intake boundary",
  "## 2. Webhook idempotency design",
  "## 3. Task lease model",
  "## 4. Heartbeat and stuck detection",
  "## 5. Retry and rate-limit policy",
  "## 6. Reusable workflow baseline",
  "## 7. Future worker states",
  "## 8. Fallback path",
  "## 9. Completion criteria",
]);

// Phase 6B-3 supply-chain/CI contract must remain complete.
mustHaveAll("supply chain ci", supplyChainCi, supplyChainCiItems);
mustAppearInOrder("supply chain ci", supplyChainCi, [
  "## 1. Secrets and permission inventory",
  "## 2. Workflow permission review",
  "## 3. Branch protection and ruleset inventory",
  "## 4. Third-party action risk scoring",
  "## 5. Dependency risk scoring",
  "## 6. Build provenance and artifact attestation readiness",
  "## 7. Config and infra drift audit",
  "## 8. Incident freeze mode",
  "## 9. Completion criteria",
]);

// Active queue must point to the current work-breakdown phase names.
mustHaveAll("automation queue", automationQueue, [
  "Purpose: active execution queue for the automation-platform lane.",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "Phase 6A separation foundation contract is recorded in `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`.",
  "Automation Phase 6B harden the separated platform.",
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
