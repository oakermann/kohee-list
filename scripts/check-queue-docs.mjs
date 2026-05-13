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

const enterpriseContractLinks = [
  "docs/AUTOMATION_PLATFORM_6B1_TRUST_POLICY_APPROVAL.md",
  "docs/AUTOMATION_PLATFORM_6B2_EVENT_WORKER_LEASE.md",
  "docs/AUTOMATION_PLATFORM_6B3_SUPPLY_CHAIN_CI.md",
  "docs/AUTOMATION_PLATFORM_6B4_RECOVERY_ROLLBACK.md",
  "docs/AUTOMATION_PLATFORM_6B5_OBSERVABILITY_CONTROL_BOARD.md",
  "docs/AUTOMATION_PLATFORM_6B6_BUDGET_RETRY_MATURITY_PREP.md",
];

const contractSpecs = [
  {
    label: "trust policy approval",
    content: docs.trustPolicyApproval,
    title: "Phase 6B-1 Trust Policy Approval Contract",
    required: [
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
    ],
    order: [
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
    ],
  },
  {
    label: "event worker lease",
    content: docs.eventWorkerLease,
    title: "Phase 6B-2 Event Worker Lease Contract",
    required: [
      "Event intake boundary",
      "Webhook idempotency design",
      "Task lease model",
      "Heartbeat and stuck detection",
      "Retry and rate-limit policy",
      "Reusable workflow baseline",
      "Future worker states",
      "Fallback path",
      "Completion criteria",
    ],
    order: [
      "## 1. Event intake boundary",
      "## 2. Webhook idempotency design",
      "## 3. Task lease model",
      "## 4. Heartbeat and stuck detection",
      "## 5. Retry and rate-limit policy",
      "## 6. Reusable workflow baseline",
      "## 7. Future worker states",
      "## 8. Fallback path",
      "## 9. Completion criteria",
    ],
  },
  {
    label: "supply chain ci",
    content: docs.supplyChainCi,
    title: "Phase 6B-3 Supply Chain CI Contract",
    required: [
      "Secrets and permission inventory",
      "Workflow permission review",
      "Branch protection and ruleset inventory",
      "Third-party action risk scoring",
      "Dependency risk scoring",
      "Build provenance and artifact attestation readiness",
      "Config and infra drift audit",
      "Incident freeze mode",
      "Completion criteria",
    ],
    order: [
      "## 1. Secrets and permission inventory",
      "## 2. Workflow permission review",
      "## 3. Branch protection and ruleset inventory",
      "## 4. Third-party action risk scoring",
      "## 5. Dependency risk scoring",
      "## 6. Build provenance and artifact attestation readiness",
      "## 7. Config and infra drift audit",
      "## 8. Incident freeze mode",
      "## 9. Completion criteria",
    ],
  },
  {
    label: "recovery rollback",
    content: docs.recoveryRollback,
    title: "Phase 6B-4 Recovery Rollback Contract",
    required: [
      "Release checklist",
      "Rollback runbook",
      "Last-known-good SHA policy",
      "Cloudflare rollback and deployment evidence",
      "D1 backup and restore drill policy",
      "Evidence archive and decision log",
      "Failed PR and blocked-lane history",
      "Incident response and postmortem",
      "Release notes and changelog requirements",
      "Completion criteria",
    ],
    order: [
      "## 1. Release checklist",
      "## 2. Rollback runbook",
      "## 3. Last-known-good SHA policy",
      "## 4. Cloudflare rollback and deployment evidence",
      "## 5. D1 backup and restore drill policy",
      "## 6. Evidence archive and decision log",
      "## 7. Failed PR and blocked-lane history",
      "## 8. Incident response and postmortem",
      "## 9. Release notes and changelog requirements",
      "## 10. Completion criteria",
    ],
  },
  {
    label: "observability control board",
    content: docs.observabilityControlBoard,
    title: "Phase 6B-5 Observability Control Board Contract",
    required: [
      "Delivery metrics",
      "Automation SLO design",
      "Health alert design",
      "Error monitoring design",
      "Browser smoke and E2E visibility",
      "Incident visibility",
      "Customer impact and maintenance signals",
      "Control-board data-source mapping",
      "Completion criteria",
    ],
    order: [
      "## 1. Delivery metrics",
      "## 2. Automation SLO design",
      "## 3. Health alert design",
      "## 4. Error monitoring design",
      "## 5. Browser smoke and E2E visibility",
      "## 6. Incident visibility",
      "## 7. Customer impact and maintenance signals",
      "## 8. Control-board data-source mapping",
      "## 9. Completion criteria",
    ],
  },
  {
    label: "budget retry maturity prep",
    content: docs.budgetRetryMaturityPrep,
    title: "Phase 6B-6 Budget Retry Maturity Prep Contract",
    required: [
      "Cost and quota guardrail",
      "Retry budget",
      "Concurrency cap",
      "Daily PR and lane cap",
      "Phase 6C maturity gate checklist",
      "Reusable template extraction plan",
      "Automation docs simplification plan",
      "Remaining HOLD list",
      "Phase 6B closure package",
      "Completion criteria",
    ],
    order: [
      "## 1. Cost and quota guardrail",
      "## 2. Retry budget",
      "## 3. Concurrency cap",
      "## 4. Daily PR and lane cap",
      "## 5. Phase 6C maturity gate checklist",
      "## 6. Reusable template extraction plan",
      "## 7. Automation docs simplification plan",
      "## 8. Remaining HOLD list",
      "## 9. Phase 6B closure package",
      "## 10. Completion criteria",
    ],
  },
  {
    label: "maturity gate",
    content: docs.maturityGate,
    title: "Phase 6C Maturity Gate",
    required: [
      "Gate decision",
      "Evidence checklist",
      "Completed foundation evidence",
      "Remaining HOLD list",
      "Product resume decision",
      "Post-gate options",
      "Go / No-Go criteria",
      "Maturity result",
      "Completion criteria",
      "HOLD_PRODUCT_RESUME",
      "PRODUCT_RESUME_NOT_AUTOMATIC",
      "STRONGER_AUTOMATION_BEHAVIOR_REMAINS_HOLD",
    ],
    order: [
      "## 1. Gate decision",
      "## 2. Evidence checklist",
      "## 3. Completed foundation evidence",
      "## 4. Remaining HOLD list",
      "## 5. Product resume decision",
      "## 6. Post-gate options",
      "## 7. Go / No-Go criteria",
      "## 8. Maturity result",
      "## 9. Completion criteria",
    ],
  },
];

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
for (const linkedDoc of enterpriseContractLinks) {
  mustHave("enterprise hardening", docs.enterpriseHardening, linkedDoc);
}

for (const spec of contractSpecs) {
  mustHave(spec.label, spec.content, spec.title);
  mustHaveAll(spec.label, spec.content, spec.required);
  mustAppearInOrder(spec.label, spec.content, spec.order);
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
