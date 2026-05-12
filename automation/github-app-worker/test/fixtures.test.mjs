import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { decideWebhookAction } from "../src/policy.mjs";

const execFileAsync = promisify(execFile);

async function loadFixture(name) {
  const raw = await readFile(
    new URL(`../fixtures/${name}`, import.meta.url),
    "utf8",
  );
  return JSON.parse(raw);
}

async function decideFixture(name) {
  const fixture = await loadFixture(name);
  return decideWebhookAction(fixture.event, fixture.payload);
}

const safeDocs = await decideFixture("pull-request-safe-docs.json");
assert.equal(safeDocs.decision, "AUTO_MERGE_ELIGIBLE_DRY_RUN");
assert.deepEqual(safeDocs.wouldDo, ["enable_native_auto_merge"]);
assert.equal(safeDocs.pullRequest, 101);

const highRiskSchema = await decideFixture(
  "pull-request-high-risk-schema.json",
);
assert.equal(highRiskSchema.decision, "AUTO_MERGE_REJECT");
assert.deepEqual(highRiskSchema.highRiskFiles, ["schema.sql"]);
assert.deepEqual(highRiskSchema.wouldDo, ["comment_hold_or_observe"]);

const prOpenWithoutUrl = await decideFixture(
  "issue-comment-pr-open-without-url.json",
);
assert.equal(prOpenWithoutUrl.decision, "REJECT");
assert.match(prOpenWithoutUrl.reasons.join(" "), /issue is not allowed/);

const holdWithMakePr = await decideFixture(
  "issue-comment-hold-with-make-pr.json",
);
assert.equal(holdWithMakePr.decision, "REJECT");
assert.match(holdWithMakePr.reasons.join(" "), /issue is not allowed/);

const { stdout } = await execFileAsync(process.execPath, [
  "automation/github-app-worker/simulate-fixture.mjs",
  "automation/github-app-worker/fixtures/pull-request-safe-docs.json",
]);
const simulated = JSON.parse(stdout);
assert.equal(simulated.decision, "AUTO_MERGE_ELIGIBLE_DRY_RUN");
assert.equal(simulated.dryRun, true);

console.log("[github-app-worker-fixtures] ok");
