import assert from "node:assert/strict";
import fs from "node:fs";

import {
  controlPlaneHardeningDryRun,
  formatControlPlaneHardeningReport,
} from "./control-plane-hardening-dry-run.mjs";

function readJson(name) {
  return JSON.parse(fs.readFileSync(`scripts/fixtures/${name}`, "utf8"));
}

const ready = controlPlaneHardeningDryRun(
  readJson("control-plane-dry-run-ready.json"),
);
assert.equal(ready.ok, true);
assert.equal(ready.decision, "CONTROL_PLANE_DRY_RUN_READY");
assert.equal(ready.reason, "CONTROL_PLANE_FLOW_IS_DRY_RUN_ONLY");
assert.deepEqual(ready.writes, []);
assert.equal(ready.issueCommentWrite, false);
assert.equal(ready.prMerge, false);
assert.equal(ready.secretsTouched, false);
assert.equal(ready.deployTouched, false);
assert.equal(ready.nativeAutoMergeEnabled, false);
assert.equal(ready.unattendedLoopEnabled, false);

const fixRequired = controlPlaneHardeningDryRun(
  readJson("control-plane-dry-run-fix-required.json"),
);
assert.equal(fixRequired.ok, false);
assert.equal(fixRequired.decision, "FIX_REQUIRED");
assert.equal(fixRequired.reason, "FIX_CONTROL_PLANE_DRY_RUN_INPUT");
assert.match(fixRequired.errors.join("\n"), /FIX_REQUIRED/);
assert.match(fixRequired.errors.join("\n"), /MERGE_READY_DRY_RUN/);

const hold = controlPlaneHardeningDryRun(
  readJson("control-plane-dry-run-hold.json"),
);
assert.equal(hold.ok, false);
assert.equal(hold.decision, "HOLD");
assert.equal(hold.reason, "HOLD_CONTROL_PLANE_WRITE_ATTEMPT");

const nativeAutoMerge = controlPlaneHardeningDryRun({
  ...readJson("control-plane-dry-run-ready.json"),
  flow: {
    ...readJson("control-plane-dry-run-ready.json").flow,
    mergeDecision: {
      source: "fixture",
      writes: false,
      decision: "MERGE_READY_DRY_RUN",
      nativeAutoMergeEnabled: true,
    },
  },
});
assert.equal(nativeAutoMerge.decision, "HOLD");
assert.equal(nativeAutoMerge.reason, "HOLD_NATIVE_AUTO_MERGE_ENABLEMENT");

const report = formatControlPlaneHardeningReport(ready);
assert.match(report, /Control-plane hardening dry-run/);
assert.match(report, /Decision: CONTROL_PLANE_DRY_RUN_READY/);
assert.match(report, /Issue comment write: no/);
assert.match(report, /PR merge: no/);
assert.match(report, /Native auto-merge enabled: no/);
assert.match(report, /Unattended loop enabled: no/);

console.log("[control-plane-hardening-dry-run] ok");
