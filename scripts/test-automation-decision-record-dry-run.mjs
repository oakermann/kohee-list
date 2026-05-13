import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAutomationDecisionRecord,
  formatAutomationDecisionRecord,
} from "./automation-decision-record-dry-run.mjs";

function readJson(name) {
  return JSON.parse(fs.readFileSync(`scripts/fixtures/${name}`, "utf8"));
}

const readyInput = readJson("automation-decision-ready.json");
const ready = buildAutomationDecisionRecord(readyInput);
assert.equal(ready.ok, true);
assert.equal(ready.decision, "MERGE_READY_DRY_RUN");
assert.equal(ready.reason, "ALL_EVIDENCE_GATES_PASSED");
assert.deepEqual(ready.writes, []);
assert.equal(ready.nativeAutoMergeEnabled, false);

const merged = buildAutomationDecisionRecord({
  ...readyInput,
  prEvidence: { ...readyInput.prEvidence, merged: true },
});
assert.equal(merged.decision, "NEXT");
assert.equal(merged.reason, "PR_ALREADY_MERGED");

const highPolicy = buildAutomationDecisionRecord({
  ...readyInput,
  policyRisk: readJson("policy-risk-high-hold.json"),
});
assert.equal(highPolicy.decision, "HOLD");
assert.equal(highPolicy.reason, "HOLD_POLICY_RISK");

const invalidPacket = buildAutomationDecisionRecord({
  ...readyInput,
  taskPacketText: "",
});
assert.equal(invalidPacket.decision, "HOLD");
assert.equal(invalidPacket.reason, "HOLD_TASK_PACKET_MISSING");

const mismatch = buildAutomationDecisionRecord({
  ...readyInput,
  projectProfile: { project: "Other project", status: "first_managed_project" },
});
assert.equal(mismatch.decision, "FIX_REQUIRED");
assert.equal(mismatch.reason, "FIX_DECISION_INPUT_MISMATCH");

const placeholder = buildAutomationDecisionRecord({
  ...readyInput,
  projectProfile: { project: "KOHEE LIST", status: "placeholder_only" },
});
assert.equal(placeholder.decision, "HOLD");
assert.equal(placeholder.reason, "HOLD_PLACEHOLDER_PROJECT_PROFILE");

const blockedByPrEvidence = buildAutomationDecisionRecord({
  ...readyInput,
  prEvidence: {
    ...readyInput.prEvidence,
    changedFiles: ["scripts/unexpected.mjs"],
  },
});
assert.equal(blockedByPrEvidence.decision, "FIX_REQUIRED");
assert.equal(blockedByPrEvidence.reason, "FIX_CHANGED_FILES_OUT_OF_SCOPE");

const report = formatAutomationDecisionRecord(ready);
assert.match(report, /Automation decision record dry-run/);
assert.match(report, /Decision: MERGE_READY_DRY_RUN/);
assert.match(report, /Writes: none/);
assert.match(report, /Native auto-merge enabled: no/);

console.log("[automation-decision-record-dry-run] ok");
