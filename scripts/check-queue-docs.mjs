#!/usr/bin/env node
import fs from "node:fs";

const files = {
  router: "docs/QUEUE_ROUTER.md",
  automationQueue: "docs/queues/AUTOMATION_PLATFORM.md",
  productQueue: "docs/queues/KOHEE_PRODUCT.md",
  workBreakdown: "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md",
  extraHardening: "docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md",
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

const router = read(files.router);
const automationQueue = read(files.automationQueue);
const productQueue = read(files.productQueue);
const workBreakdown = read(files.workBreakdown);
const extraHardening = read(files.extraHardening);

mustHave("router", router, "`AUTOMATION_PLATFORM`");
mustHave("router", router, "docs/queues/AUTOMATION_PLATFORM.md");
mustHave("router", router, "docs/queues/KOHEE_PRODUCT.md");
mustHave("router", router, "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md");
mustHave("router", router, "docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md");
mustHave("router", router, "Status / Blocker / Next action / Evidence");

for (const [label, content] of [
  ["automation queue", automationQueue],
  ["work breakdown", workBreakdown],
]) {
  mustHave(label, content, "Phase 5 bridge");
  mustHave(label, content, "Phase 6A");
  mustHave(label, content, "Phase 6B");
  mustHave(label, content, "Phase 6C");
  mustHave(label, content, "Evidence-based decision system");
  mustHave(label, content, "Supply-chain and CI/CD posture");
  mustHave(label, content, "Recovery and rollback auditability");
}

mustHave("automation queue", automationQueue, "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md");
mustHave("automation queue", automationQueue, "docs/queues/KOHEE_PRODUCT.md");
mustHave("automation queue", automationQueue, "MERGE / FIX / HOLD / NEXT");
mustHave("automation queue", automationQueue, "KOHEE product work");
mustHave("automation queue", automationQueue, "dependency/package changes");
mustNotHave("automation queue", automationQueue, "docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 4");

mustHave("work breakdown", workBreakdown, "Source of truth:");
mustHave("work breakdown", workBreakdown, "docs/QUEUE_ROUTER.md");
mustHave("work breakdown", workBreakdown, "docs/queues/AUTOMATION_PLATFORM.md");
mustHave("work breakdown", workBreakdown, "docs/queues/KOHEE_PRODUCT.md");
mustHave("work breakdown", workBreakdown, "Protected environment approval gate design");
mustHave("work breakdown", workBreakdown, "Phase 5 bridge comes first");

mustHave("product queue", productQueue, "Paused while the automation-platform lane is active.");
mustHave("product queue", productQueue, "docs/queues/AUTOMATION_PLATFORM.md");
mustHave("product queue", productQueue, "platform maturity gate");
mustHave("product queue", productQueue, "owner explicitly defers the automation lane");

mustHave("extra hardening", extraHardening, "automation");
if (/active execution queue/i.test(extraHardening)) {
  fail("extra hardening is marked like an active queue");
} else {
  ok("extra hardening is not marked as active queue");
}

if (errors.length) {
  console.log(`\nResult: FAIL (${errors.length} queue/doc issue(s))`);
  process.exit(1);
}

console.log("\nResult: PASS queue/doc consistency");
