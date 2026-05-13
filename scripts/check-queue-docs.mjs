#!/usr/bin/env node
import fs from "node:fs";

const files = {
  router: "docs/QUEUE_ROUTER.md",
  automationQueue: "docs/queues/AUTOMATION_PLATFORM.md",
  productQueue: "docs/queues/KOHEE_PRODUCT.md",
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

function mustAppearInOrder(label, content, items) {
  let lastIndex = -1;
  for (const item of items) {
    const index = content.indexOf(item);
    if (index === -1) {
      fail(`${label} missing ordered item: ${item}`);
      return;
    }
    if (index <= lastIndex) {
      fail(`${label} order mismatch at: ${item}`);
      return;
    }
    lastIndex = index;
  }
  ok(`${label}: ordered items match`);
}

function mustHaveAll(label, content, items) {
  for (const item of items) mustHave(label, content, item);
}

const router = read(files.router);
const automationQueue = read(files.automationQueue);
const productQueue = read(files.productQueue);
const workBreakdown = read(files.workBreakdown);
const extraHardening = read(files.extraHardening);
const packageJson = read(files.packageJson);
const verifyRelease = read(files.verifyRelease);

// Router/source-of-truth group.
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

// Active queue and work-breakdown must share the same phase vocabulary.
for (const [label, content] of [
  ["automation queue", automationQueue],
  ["work breakdown", workBreakdown],
]) {
  mustHaveAll(label, content, [
    "Phase 5 bridge",
    "Phase 6A",
    "Phase 6B",
    "Phase 6C",
    "Evidence-based decision system",
    "Supply-chain and CI/CD posture",
    "Recovery and rollback auditability",
  ]);
  mustAppearInOrder(label, content, [
    "Phase 5 bridge",
    "Phase 6A",
    "Phase 6B",
    "Phase 6C",
  ]);
}

// Active queue must point to the current work-breakdown phase names.
mustHaveAll("automation queue", automationQueue, [
  "Purpose: active execution queue for the automation-platform lane.",
  "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  "docs/queues/KOHEE_PRODUCT.md",
  "MERGE / FIX / HOLD / NEXT",
  "KOHEE product work",
  "dependency/package changes",
  "Do not resume KOHEE product work unless the maturity gate passes",
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
  "Protected environment approval gate design",
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
if (/active execution queue/i.test(extraHardening)) {
  fail("extra hardening is marked like an active queue");
} else {
  ok("extra hardening is not marked as active queue");
}

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
