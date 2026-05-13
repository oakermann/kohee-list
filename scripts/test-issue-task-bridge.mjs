import assert from "node:assert/strict";
import fs from "node:fs";

import {
  bridgeIssueTaskDryRun,
  extractIssueTaskPackets,
  formatIssueTaskBridgeReport,
  normalizeIssueComments,
} from "./issue-task-bridge.mjs";

function readJson(name) {
  return JSON.parse(fs.readFileSync(`scripts/fixtures/${name}`, "utf8"));
}

const oneActive = readJson("issue-23-comments-one-active.json");
assert.equal(normalizeIssueComments(oneActive).length, 1);
assert.equal(extractIssueTaskPackets(oneActive).length, 1);

const selected = bridgeIssueTaskDryRun({
  comments: oneActive,
  evidence: {
    openPullRequests: 0,
    failedChecks: [],
    unresolvedReviewThreads: 0,
    issueBlockers: [],
  },
  now: new Date("2026-05-13T00:00:00Z"),
});
assert.equal(selected.ok, true);
assert.equal(selected.decision, "SELECT_TASK_DRY_RUN");
assert.equal(selected.reason, "ACTIVE_TASK_PACKET_SELECTED");
assert.equal(selected.packet.fields.task_id, "issue-23-bridge-dry-run");
assert.deepEqual(selected.writes, []);

const missing = bridgeIssueTaskDryRun({ comments: [] });
assert.equal(missing.ok, false);
assert.equal(missing.decision, "HOLD");
assert.equal(missing.reason, "HOLD_TASK_PACKET_MISSING");

const multiple = bridgeIssueTaskDryRun({
  comments: readJson("issue-23-comments-multiple-active.json"),
  now: new Date("2026-05-13T00:00:00Z"),
});
assert.equal(multiple.ok, false);
assert.equal(multiple.decision, "HOLD");
assert.equal(multiple.reason, "HOLD_MULTIPLE_ACTIVE_TASK_PACKETS");

const blocked = bridgeIssueTaskDryRun({
  comments: oneActive,
  evidence: readJson("issue-23-evidence-blocker.json"),
});
assert.equal(blocked.ok, false);
assert.equal(blocked.decision, "HOLD");
assert.equal(blocked.reason, "HOLD_GITHUB_EVIDENCE_BLOCKER");
assert.match(blocked.errors.join("\n"), /open PR blocker count: 1/);

const invalid = bridgeIssueTaskDryRun({
  comments: [
    {
      id: 2303,
      body: fs.readFileSync(
        "scripts/fixtures/task-packet-invalid-missing-risk.txt",
        "utf8",
      ),
    },
  ],
});
assert.equal(invalid.ok, false);
assert.equal(invalid.decision, "FIX_REQUIRED");
assert.equal(invalid.reason, "FIX_TASK_PACKET_INVALID");

const report = formatIssueTaskBridgeReport(blocked);
assert.match(report, /Issue task bridge dry-run/);
assert.match(report, /Writes: none/);
assert.match(report, /HOLD_GITHUB_EVIDENCE_BLOCKER/);

console.log("[issue-task-bridge] ok");
