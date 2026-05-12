import assert from "node:assert/strict";

import { handleRequest } from "../src/index.mjs";
import {
  classifyCodexComment,
  classifyKoheeStatusComment,
  classifyPullRequest,
  decideWebhookAction,
  parseKoheeStatusBlock,
} from "../src/policy.mjs";
import {
  isAllowedRepository,
  isSelfBotActor,
  signGithubWebhookBody,
  verifyGithubSignature,
} from "../src/security.mjs";

const env = {
  GITHUB_WEBHOOK_SECRET: "unit-secret",
  KOHEE_BOT_ALLOWED_REPOS: "oakermann/kohee-list",
  KOHEE_BOT_LOGINS: "kohee-list-automation[bot]",
};

function payload(overrides = {}) {
  return {
    action: "opened",
    repository: { full_name: "oakermann/kohee-list" },
    sender: { login: "oakermann" },
    ...overrides,
  };
}

async function signedWebhookRequest(event, bodyObject, customEnv = env) {
  const body = JSON.stringify(bodyObject);
  const signature = await signGithubWebhookBody(
    body,
    customEnv.GITHUB_WEBHOOK_SECRET,
  );
  return new Request("https://bot.test/github/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-github-delivery": "delivery-1",
      "x-hub-signature-256": signature,
    },
    body,
  });
}

function assertDryRunLog(json, expectedDecision) {
  assert.equal(json.dryRunLog.type, "kohee.github_app_worker.dry_run_decision");
  assert.equal(json.dryRunLog.dryRun, true);
  assert.equal(json.dryRunLog.decision, expectedDecision);
  assert.ok(json.dryRunLog.timestamp);
  assert.ok(json.dryRunLog.deliveryId);
}

function koheeStatus({
  risk = "LOW",
  lane = "GOVERNANCE",
  mode = "docs-only",
  headSha = "abc123",
  pr = 101,
} = {}) {
  return [
    "KOHEE_STATUS:",
    "  state: PR_OPEN",
    `  risk: ${risk}`,
    `  lane: ${lane}`,
    `  mode: ${mode}`,
    `  active_pr: https://github.com/oakermann/kohee-list/pull/${pr}`,
    `  head_sha: ${headSha}`,
    "  evidence:",
    `    pr_url: https://github.com/oakermann/kohee-list/pull/${pr}`,
  ].join("\n");
}

function successfulChecks() {
  return [
    { name: "pr-validate", conclusion: "success" },
    { name: "verify", conclusion: "success" },
  ];
}

function eligiblePullRequest(overrides = {}) {
  return {
    body: koheeStatus(overrides.status || {}),
    files: ["docs/GITHUB_APP_WORKER_AUTOMATION_PLAN.md"],
    baseRef: "main",
    headRepo: "oakermann/kohee-list",
    headSha: overrides.status?.headSha || "abc123",
    mergeable: true,
    checks: successfulChecks(),
    ...overrides,
  };
}

assert.equal(isAllowedRepository(payload(), "oakermann/kohee-list"), true);
assert.equal(isAllowedRepository(payload(), "other/repo"), false);
assert.equal(
  isSelfBotActor("kohee-list-automation[bot]", ["kohee-list-automation[bot]"]),
  true,
);
assert.equal(
  isSelfBotActor("chatgpt-codex-connector[bot]", [
    "kohee-list-automation[bot]",
  ]),
  false,
);

const signed = await signGithubWebhookBody("{}", "unit-secret");
assert.match(signed, /^sha256=[0-9a-f]{64}$/);
assert.equal(await verifyGithubSignature("{}", signed, "unit-secret"), true);
assert.equal(await verifyGithubSignature("{}", signed, "wrong-secret"), false);

const health = await handleRequest(new Request("https://bot.test/health"), env);
assert.equal(health.status, 200);
const healthJson = await health.json();
assert.equal(healthJson.dryRun, true);

const safePr = classifyPullRequest({
  ...eligiblePullRequest(),
});
assert.equal(safePr.decision, "AUTO_MERGE_ELIGIBLE_DRY_RUN");

const unknownRiskDocsPr = classifyPullRequest({
  body: "Lane: GOVERNANCE\nDocs-only change.",
  files: ["docs/example.md"],
});
assert.equal(unknownRiskDocsPr.decision, "AUTO_MERGE_OBSERVE");
assert.match(
  unknownRiskDocsPr.reasons.join(" "),
  /does not contain KOHEE_STATUS/,
);

const highRiskPr = classifyPullRequest({
  body: koheeStatus({ risk: "LOW", mode: "docs-only" }),
  files: ["schema.sql"],
  headSha: "abc123",
  checks: successfulChecks(),
});
assert.equal(highRiskPr.decision, "AUTO_MERGE_REJECT");
assert.deepEqual(highRiskPr.highRiskFiles, ["schema.sql"]);

const draftPr = classifyPullRequest({
  body: koheeStatus(),
  draft: true,
  files: ["docs/example.md"],
  headSha: "abc123",
  checks: successfulChecks(),
});
assert.equal(draftPr.decision, "AUTO_MERGE_REJECT");
assert.match(draftPr.reasons.join(" "), /draft/);

const mediumRiskPr = classifyPullRequest({
  ...eligiblePullRequest({ status: { risk: "MEDIUM" } }),
});
assert.equal(mediumRiskPr.decision, "AUTO_MERGE_REJECT");
assert.match(mediumRiskPr.reasons.join(" "), /LOW-only/);

const missingStatusRiskPr = classifyPullRequest({
  ...eligiblePullRequest({
    body: [
      "KOHEE_STATUS:",
      "  state: PR_OPEN",
      "  lane: GOVERNANCE",
      "  mode: docs-only",
      "  active_pr: https://github.com/oakermann/kohee-list/pull/101",
      "  head_sha: abc123",
      "  evidence:",
      "    pr_url: https://github.com/oakermann/kohee-list/pull/101",
      "",
      "Summary: LOW docs-only wording outside the status block.",
    ].join("\n"),
  }),
});
assert.equal(missingStatusRiskPr.decision, "AUTO_MERGE_REJECT");
assert.match(
  missingStatusRiskPr.reasons.join(" "),
  /KOHEE_STATUS risk is missing/,
);

const malformedLanePr = classifyPullRequest({
  ...eligiblePullRequest({ status: { lane: "NOT_A_LANE" } }),
});
assert.equal(malformedLanePr.decision, "AUTO_MERGE_REJECT");
assert.match(
  malformedLanePr.reasons.join(" "),
  /unsupported KOHEE_STATUS lane: NOT_A_LANE/,
);

const malformedModePr = classifyPullRequest({
  ...eligiblePullRequest({ status: { mode: "mixed" } }),
});
assert.equal(malformedModePr.decision, "AUTO_MERGE_REJECT");
assert.match(
  malformedModePr.reasons.join(" "),
  /unsupported KOHEE_STATUS mode/,
);

const failingCheckPr = classifyPullRequest({
  ...eligiblePullRequest({
    checks: [
      { name: "pr-validate", conclusion: "success" },
      { name: "verify", conclusion: "failure" },
    ],
  }),
});
assert.equal(failingCheckPr.decision, "AUTO_MERGE_REJECT");
assert.match(failingCheckPr.reasons.join(" "), /failing checks: verify/);

const missingCheckPr = classifyPullRequest({
  ...eligiblePullRequest({
    checks: [{ name: "pr-validate", conclusion: "success" }],
  }),
});
assert.equal(missingCheckPr.decision, "AUTO_MERGE_REJECT");
assert.match(
  missingCheckPr.reasons.join(" "),
  /missing successful required checks: verify/,
);

const unresolvedReviewPr = classifyPullRequest({
  ...eligiblePullRequest({ unresolvedReviewThreads: 1 }),
});
assert.equal(unresolvedReviewPr.decision, "AUTO_MERGE_HOLD");
assert.match(unresolvedReviewPr.reasons.join(" "), /unresolved review threads/);

const requestedChangesPr = classifyPullRequest({
  ...eligiblePullRequest({ requestedChanges: 1 }),
});
assert.equal(requestedChangesPr.decision, "AUTO_MERGE_HOLD");
assert.match(requestedChangesPr.reasons.join(" "), /requested changes reviews/);

const mergeConflictPr = classifyPullRequest({
  ...eligiblePullRequest({ mergeable: false }),
});
assert.equal(mergeConflictPr.decision, "AUTO_MERGE_REJECT");
assert.match(mergeConflictPr.reasons.join(" "), /not mergeable/);

const wrongBasePr = classifyPullRequest({
  ...eligiblePullRequest({ baseRef: "release" }),
});
assert.equal(wrongBasePr.decision, "AUTO_MERGE_REJECT");
assert.match(wrongBasePr.reasons.join(" "), /base branch is not main/);

const wrongHeadRepoPr = classifyPullRequest({
  ...eligiblePullRequest({ headRepo: "fork/kohee-list" }),
});
assert.equal(wrongHeadRepoPr.decision, "AUTO_MERGE_REJECT");
assert.match(
  wrongHeadRepoPr.reasons.join(" "),
  /head repository is not allowed/,
);

const mismatchedHeadShaPr = classifyPullRequest({
  ...eligiblePullRequest({ headSha: "def456" }),
});
assert.equal(mismatchedHeadShaPr.decision, "AUTO_MERGE_REJECT");
assert.match(mismatchedHeadShaPr.reasons.join(" "), /head_sha does not match/);

assert.equal(
  classifyCodexComment(
    "I called make_pr but no actual GitHub PR URL was returned.",
  ).decision,
  "OBSERVE",
);
assert.equal(
  classifyCodexComment("PR_OPEN but no actual GitHub PR URL was returned.")
    .decision,
  "UNVERIFIED_PR_CLAIM",
);
assert.equal(
  classifyCodexComment(
    "HOLD_HIGH_RISK: make_pr unavailable and policy decision needed.",
  ).decision,
  "HOLD_HIGH_RISK",
);
assert.equal(
  classifyCodexComment("PATCH_READY: proposed docs-only patch.").decision,
  "PATCH_READY",
);
assert.equal(
  classifyCodexComment("HOLD_USER_APPROVAL: policy decision needed.").decision,
  "HOLD_USER_APPROVAL",
);

const validKoheeStatus = [
  "KOHEE_STATUS:",
  "  state: PR_OPEN",
  "  risk: LOW",
  "  lane: GOVERNANCE",
  "  active_pr: https://github.com/oakermann/kohee-list/pull/139",
  "  head_sha: abc123",
  "  evidence:",
  "    pr_url: https://github.com/oakermann/kohee-list/pull/139",
].join("\n");
assert.equal(parseKoheeStatusBlock(validKoheeStatus).state, "PR_OPEN");
assert.equal(
  classifyKoheeStatusComment(validKoheeStatus, 23).decision,
  "RECORD_STATUS_DRY_RUN",
);
assert.equal(
  classifyKoheeStatusComment(validKoheeStatus, 99).decision,
  "REJECT",
);
assert.match(
  classifyKoheeStatusComment(
    "KOHEE_STATUS:\n  state: PR_OPEN\n  risk: LOW\n  lane: AUTOMATION_CONNECTIVITY\n  active_pr: https://github.com/oakermann/kohee-list/pull/139",
    23,
  ).reasons.join(" "),
  /unsupported KOHEE_STATUS lane/,
);
assert.match(
  classifyKoheeStatusComment(
    "KOHEE_STATUS:\n  state: PR_OPEN\n  risk: LOW\n  lane: GOVERNANCE",
    23,
  ).reasons.join(" "),
  /PR_OPEN requires/,
);
assert.match(
  classifyKoheeStatusComment(
    "KOHEE_STATUS:\n  state: DONE_NO_DEPLOY\n  risk: LOW\n  lane: GOVERNANCE\n  evidence:\n    pr_url: https://github.com/other/repo/pull/1",
    23,
  ).reasons.join(" "),
  /oakermann\/kohee-list/,
);
assert.equal(
  classifyKoheeStatusComment(
    "KOHEE_STATUS:\n  state: HOLD\n  risk: HIGH\n  lane: GOVERNANCE\n  blocker: HOLD_HIGH_RISK",
    23,
  ).decision,
  "RECORD_STATUS_DRY_RUN",
);

const decision = decideWebhookAction(
  "pull_request",
  payload({
    pull_request: {
      number: 65,
      body: koheeStatus({ pr: 65 }),
      draft: false,
      base: { ref: "main" },
      head: {
        sha: "abc123",
        repo: { full_name: "oakermann/kohee-list" },
      },
      mergeable: true,
    },
    kohee: {
      changed_files: ["docs/GITHUB_APP_WORKER_AUTOMATION_PLAN.md"],
      checks: successfulChecks(),
      unresolved_review_threads: 0,
      requested_changes: 0,
    },
  }),
);
assert.equal(decision.decision, "AUTO_MERGE_ELIGIBLE_DRY_RUN");
assert.deepEqual(decision.wouldDo, ["enable_native_auto_merge"]);

const statusDecision = decideWebhookAction(
  "issue_comment",
  payload({
    action: "created",
    issue: { number: 23 },
    comment: { body: validKoheeStatus },
  }),
);
assert.equal(statusDecision.decision, "RECORD_STATUS_DRY_RUN");
assert.deepEqual(statusDecision.wouldDo, ["record_status_dry_run"]);

const unsupportedIssueDecision = decideWebhookAction(
  "issue_comment",
  payload({
    action: "created",
    issue: { number: 99 },
    comment: { body: validKoheeStatus },
  }),
);
assert.equal(unsupportedIssueDecision.decision, "REJECT");

const unsupportedIssueMalformedStatusDecision = decideWebhookAction(
  "issue_comment",
  payload({
    action: "created",
    issue: { number: 99 },
    comment: { body: "KOHEE_STATUS:\n  state: PR_OPEN" },
  }),
);
assert.equal(unsupportedIssueMalformedStatusDecision.decision, "REJECT");
assert.match(
  unsupportedIssueMalformedStatusDecision.reasons.join(" "),
  /issue is not allowed/,
);

const ignoredIssueActionDecision = decideWebhookAction(
  "issue_comment",
  payload({
    action: "edited",
    issue: { number: 23 },
    comment: { body: validKoheeStatus },
  }),
);
assert.equal(ignoredIssueActionDecision.decision, "OBSERVE");
assert.deepEqual(ignoredIssueActionDecision.wouldDo, []);

const webhookResponse = await handleRequest(
  await signedWebhookRequest(
    "pull_request",
    payload({
      pull_request: {
        number: 66,
        body: koheeStatus({ risk: "LOW", mode: "docs-only", pr: 66 }),
        draft: false,
        base: { ref: "main" },
        head: {
          sha: "abc123",
          repo: { full_name: "oakermann/kohee-list" },
        },
        mergeable: true,
      },
      kohee: {
        changed_files: ["migrations/0006_test.sql"],
        checks: successfulChecks(),
      },
    }),
  ),
  env,
);
assert.equal(webhookResponse.status, 200);
const webhookJson = await webhookResponse.json();
assert.equal(webhookJson.dryRun, true);
assert.equal(webhookJson.decision, "AUTO_MERGE_REJECT");
assert.deepEqual(webhookJson.wouldDo, ["comment_hold_or_observe"]);
assertDryRunLog(webhookJson, "AUTO_MERGE_REJECT");
assert.deepEqual(webhookJson.dryRunLog.highRiskFiles, [
  "migrations/0006_test.sql",
]);

const statusWebhookResponse = await handleRequest(
  await signedWebhookRequest(
    "issue_comment",
    payload({
      action: "created",
      issue: { number: 23 },
      comment: { body: validKoheeStatus },
    }),
  ),
  env,
);
assert.equal(statusWebhookResponse.status, 200);
const statusWebhookJson = await statusWebhookResponse.json();
assert.equal(statusWebhookJson.decision, "RECORD_STATUS_DRY_RUN");
assert.deepEqual(statusWebhookJson.wouldDo, ["record_status_dry_run"]);
assert.equal(statusWebhookJson.dryRunLog.issue, 23);

const deniedRepoResponse = await handleRequest(
  await signedWebhookRequest(
    "issues",
    payload({ repository: { full_name: "other/repo" } }),
  ),
  env,
);
assert.equal(deniedRepoResponse.status, 403);
const deniedRepoJson = await deniedRepoResponse.json();
assertDryRunLog(deniedRepoJson, "REJECT_REPOSITORY_NOT_ALLOWED");

const selfEventResponse = await handleRequest(
  await signedWebhookRequest(
    "issues",
    payload({ sender: { login: "kohee-list-automation[bot]" } }),
  ),
  env,
);
assert.equal(selfEventResponse.status, 200);
const selfEventJson = await selfEventResponse.json();
assert.equal(selfEventJson.decision, "IGNORE_SELF_EVENT");
assertDryRunLog(selfEventJson, "IGNORE_SELF_EVENT");

const unsignedResponse = await handleRequest(
  new Request("https://bot.test/github/webhook", {
    method: "POST",
    headers: {
      "x-github-event": "issues",
      "x-github-delivery": "delivery-unsigned",
    },
    body: JSON.stringify(payload()),
  }),
  { KOHEE_BOT_ALLOWED_REPOS: "oakermann/kohee-list" },
);
assert.equal(unsignedResponse.status, 500);

console.log("[github-app-worker-dry-run] ok");
