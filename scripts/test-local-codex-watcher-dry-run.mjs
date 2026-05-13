import assert from "node:assert/strict";
import fs from "node:fs";

import {
  formatLocalCodexWatcherReport,
  localCodexWatcherDryRun,
} from "./local-codex-watcher-dry-run.mjs";

function readJson(name) {
  return JSON.parse(fs.readFileSync(`scripts/fixtures/${name}`, "utf8"));
}

const executable = localCodexWatcherDryRun({
  comments: readJson("issue-23-comments-one-active.json"),
  now: new Date("2026-05-13T00:00:00Z"),
});
assert.equal(executable.ok, true);
assert.equal(executable.decision, "LOCAL_CODEX_EXECUTABLE_DRY_RUN");
assert.equal(executable.reason, "TASK_PACKET_EXECUTABLE");
assert.equal(executable.branchCreation, false);
assert.equal(executable.pullRequestCreation, false);
assert.equal(executable.unattendedLoop, false);
assert.deepEqual(executable.writes, []);

const bridgeBlocked = localCodexWatcherDryRun({
  comments: readJson("issue-23-comments-one-active.json"),
  evidence: readJson("issue-23-evidence-blocker.json"),
});
assert.equal(bridgeBlocked.ok, false);
assert.equal(bridgeBlocked.decision, "HOLD");
assert.equal(bridgeBlocked.reason, "HOLD_GITHUB_EVIDENCE_BLOCKER");

const forbiddenScope = localCodexWatcherDryRun({
  comments: [
    {
      id: 2401,
      body: "TASK_PACKET:\ntask_id: forbidden-local-codex\nproject: KOHEE LIST\nlane: AUTOMATION_PLATFORM\nrisk: MEDIUM\nmode: dry-run\ngoal: This should not be executable.\nallowed_files: server/auth.js\nforbidden_areas: auth/session/security\nchecks: npm run test:unit\nstop_condition: watcher returns HOLD\nreport_format: Status / Blocker / Next action / Evidence\nmerge_policy: strict-evidence-gate\nexpires_at: 2999-01-01T00:00:00Z",
    },
  ],
});
assert.equal(forbiddenScope.ok, false);
assert.equal(forbiddenScope.decision, "HOLD");
assert.equal(forbiddenScope.reason, "HOLD_RESTRICTED_SCOPE");
assert.match(forbiddenScope.errors.join("\n"), /server\/auth\.js/);

const modeMismatch = localCodexWatcherDryRun({
  comments: [
    {
      id: 2402,
      body: "TASK_PACKET:\ntask_id: docs-mode-script-file\nproject: KOHEE LIST\nlane: AUTOMATION_PLATFORM\nrisk: LOW\nmode: docs-only\ngoal: This should not be executable.\nallowed_files: scripts/task-packet.mjs\nforbidden_areas: none\nchecks: npm run test:unit\nstop_condition: watcher returns HOLD\nreport_format: Status / Blocker / Next action / Evidence\nmerge_policy: strict-evidence-gate\nexpires_at: 2999-01-01T00:00:00Z",
    },
  ],
});
assert.equal(modeMismatch.ok, false);
assert.equal(modeMismatch.decision, "HOLD");
assert.equal(modeMismatch.reason, "HOLD_RESTRICTED_SCOPE");
assert.match(modeMismatch.errors.join("\n"), /docs-only mode/);

const multiple = localCodexWatcherDryRun({
  comments: readJson("issue-23-comments-multiple-active.json"),
});
assert.equal(multiple.ok, false);
assert.equal(multiple.reason, "HOLD_MULTIPLE_ACTIVE_TASK_PACKETS");

const report = formatLocalCodexWatcherReport(executable);
assert.match(report, /Local Codex watcher dry-run/);
assert.match(report, /Branch creation: no/);
assert.match(report, /PR creation: no/);
assert.match(report, /Unattended loop: no/);

console.log("[local-codex-watcher-dry-run] ok");
