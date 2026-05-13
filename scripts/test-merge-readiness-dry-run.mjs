import assert from "node:assert/strict";
import fs from "node:fs";

import {
  formatMergeReadinessReport,
  mergeReadinessDryRun,
} from "./merge-readiness-dry-run.mjs";

function readJson(name) {
  return JSON.parse(fs.readFileSync(`scripts/fixtures/${name}`, "utf8"));
}

const ready = mergeReadinessDryRun(readJson("merge-readiness-ready.json"));
assert.equal(ready.ok, true);
assert.equal(ready.decision, "MERGE_READY_DRY_RUN");
assert.equal(ready.reason, "ALL_EVIDENCE_GATES_PASSED");
assert.equal(ready.nativeAutoMergeEnabled, false);
assert.deepEqual(ready.writes, []);

const fixRequired = mergeReadinessDryRun(
  readJson("merge-readiness-fix-required.json"),
);
assert.equal(fixRequired.ok, false);
assert.equal(fixRequired.decision, "FIX_REQUIRED");
assert.equal(fixRequired.reason, "FIX_CHANGED_FILES_OUT_OF_SCOPE");

const hold = mergeReadinessDryRun(readJson("merge-readiness-hold.json"));
assert.equal(hold.ok, false);
assert.equal(hold.decision, "HOLD");
assert.equal(hold.reason, "HOLD_REVIEW_THREADS");

const pending = mergeReadinessDryRun({
  ...readJson("merge-readiness-ready.json"),
  checks: [
    { name: "PR Validate", conclusion: "success" },
    { name: "Validate", conclusion: "in_progress" },
  ],
});
assert.equal(pending.decision, "HOLD");
assert.equal(pending.reason, "HOLD_PENDING_CHECKS");

const failed = mergeReadinessDryRun({
  ...readJson("merge-readiness-ready.json"),
  checks: [
    { name: "PR Validate", conclusion: "success" },
    { name: "Validate", conclusion: "failure" },
  ],
});
assert.equal(failed.decision, "FIX_REQUIRED");
assert.equal(failed.reason, "FIX_FAILED_CHECKS");

const movedHead = mergeReadinessDryRun({
  ...readJson("merge-readiness-ready.json"),
  headSha: "new-head",
});
assert.equal(movedHead.decision, "HOLD");
assert.equal(movedHead.reason, "HOLD_HEAD_SHA_CHANGED");

const highRisk = mergeReadinessDryRun({
  ...readJson("merge-readiness-ready.json"),
  risk: "HIGH",
});
assert.equal(highRisk.decision, "HOLD");
assert.equal(highRisk.reason, "HOLD_HIGH_RISK");

const report = formatMergeReadinessReport(ready);
assert.match(report, /Merge readiness dry-run/);
assert.match(report, /Decision: MERGE_READY_DRY_RUN/);
assert.match(report, /Native auto-merge enabled: no/);

console.log("[merge-readiness-dry-run] ok");
