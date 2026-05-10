import assert from "node:assert/strict";

import {
  classifyIssue,
  commandState,
  koheeStatusState,
  sectionStates,
} from "./kohee-status-watchdog.mjs";

const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
const freshDate = new Date().toISOString();

function issue({ number = 1, title = "", body = "", updated_at = oldDate, comments = 0 } = {}) {
  return {
    number,
    title,
    body,
    updated_at,
    comments,
    html_url: `https://github.com/oakermann/kohee-list/issues/${number}`,
    labels: [],
  };
}

assert.deepEqual(sectionStates("KOHEE_STATUS:\n  state: HOLD\n", "KOHEE_STATUS"), ["HOLD"]);
assert.equal(
  koheeStatusState("KOHEE_STATUS:\n  state: DONE_NO_DEPLOY\n\nKOHEE_STATUS:\n  state: HOLD\n"),
  "HOLD",
);
assert.equal(commandState("KOHEE_CLOUD_MAINTENANCE:\n  state: ACTIVE\n"), "ACTIVE");

const activeCloud = classifyIssue(
  issue({
    number: 23,
    title: "KOHEE_CLOUD_MAINTENANCE: Scheduled Codex maintenance",
    body: "KOHEE_CLOUD_MAINTENANCE:\n  state: ACTIVE\n",
  }),
);
assert.equal(activeCloud.state, "ACTIVE");
assert.match(activeCloud.reasons.join(" "), /ACTIVE/);

const activeParallel = classifyIssue(
  issue({
    number: 26,
    title: "KOHEE_PARALLEL_MAINTENANCE: deploy smoke verification",
    body: "KOHEE_PARALLEL_MAINTENANCE:\n  state: ACTIVE\n  high_risk_hold:\n    - HOLD_HIGH_RISK\n",
  }),
);
assert.equal(activeParallel.state, "ACTIVE");

const staleQueued = classifyIssue(
  issue({
    number: 36,
    title: "[KOHEE_TASK] Upgrade Codex Cloud automation gates",
    body: "KOHEE_COMMAND:\n  state: QUEUED\n  terminal_state: DONE_NO_DEPLOY | HOLD\n  high_risk_hold:\n    - HOLD_HIGH_RISK\n",
  }),
);
assert.equal(staleQueued.state, "STALE_QUEUED");
assert.match(staleQueued.reasons.join(" "), /queued without terminal status/);

const heldByComment = classifyIssue(
  issue({
    number: 24,
    title: "[KOHEE_TASK] Remove legacy manager role safely",
    body: "KOHEE_COMMAND:\n  state: QUEUED\n  terminal_state: MERGED_AND_DEPLOYED | DONE_NO_DEPLOY | HOLD\n",
  }),
  [
    {
      body: "KOHEE_STATUS:\n  state: HOLD\n  blocker: HOLD_USER_APPROVAL\n",
    },
  ],
);
assert.equal(heldByComment.state, "TERMINAL");
assert.match(heldByComment.reasons.join(" "), /HOLD/);

const noStaleFreshQueued = classifyIssue(
  issue({
    number: 50,
    title: "[KOHEE_COMMAND] fresh queued task",
    updated_at: freshDate,
    body: "KOHEE_COMMAND:\n  state: QUEUED\n",
  }),
);
assert.equal(noStaleFreshQueued.state, "OBSERVE");

const newestStatusWins = classifyIssue(
  issue({
    number: 51,
    title: "[KOHEE_COMMAND] status changes",
    body: "KOHEE_COMMAND:\n  state: QUEUED\n",
  }),
  [
    { body: "KOHEE_STATUS:\n  state: HOLD\n" },
    { body: "KOHEE_STATUS:\n  state: DONE_NO_DEPLOY\n" },
  ],
);
assert.equal(newestStatusWins.state, "TERMINAL");
assert.match(newestStatusWins.reasons.join(" "), /DONE_NO_DEPLOY/);

console.log("[watchdog-unit] ok");
