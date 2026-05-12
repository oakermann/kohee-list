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
  body: "Risk: LOW\nLane: GOVERNANCE\nDocs-only change.",
  files: ["docs/GITHUB_APP_WORKER_AUTOMATION_PLAN.md"],
});
assert.equal(safePr.decision, "SAFE_AUTO_MERGE_ELIGIBLE");

const unknownRiskDocsPr = classifyPullRequest({
  body: "Lane: GOVERNANCE\nDocs-only change.",
  files: ["docs/example.md"],
});
assert.equal(unknownRiskDocsPr.decision, "HOLD_HIGH_RISK");
assert.match(
  unknownRiskDocsPr.reasons.join(" "),
  /does not declare LOW or MEDIUM/,
);

const highRiskPr = classifyPullRequest({
  body: "Risk: MEDIUM\nLane: GOVERNANCE",
  files: ["schema.sql"],
});
assert.equal(highRiskPr.decision, "HOLD_HIGH_RISK");
assert.deepEqual(highRiskPr.highRiskFiles, ["schema.sql"]);

const draftPr = classifyPullRequest({
  body: "Risk: LOW\nLane: GOVERNANCE",
  draft: true,
  files: ["docs/example.md"],
});
assert.equal(draftPr.decision, "HOLD_HIGH_RISK");
assert.match(draftPr.reasons.join(" "), /draft/);

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
      body: "Risk: LOW\nLane: GOVERNANCE\nDocs-only change.",
      draft: false,
    },
    kohee: { changed_files: ["docs/GITHUB_APP_WORKER_AUTOMATION_PLAN.md"] },
  }),
);
assert.equal(decision.decision, "SAFE_AUTO_MERGE_ELIGIBLE");
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
        body: "Risk: MEDIUM\nLane: GOVERNANCE",
        draft: false,
      },
      kohee: { changed_files: ["migrations/0006_test.sql"] },
    }),
  ),
  env,
);
assert.equal(webhookResponse.status, 200);
const webhookJson = await webhookResponse.json();
assert.equal(webhookJson.dryRun, true);
assert.equal(webhookJson.decision, "HOLD_HIGH_RISK");
assert.deepEqual(webhookJson.wouldDo, ["comment_hold_or_observe"]);
assertDryRunLog(webhookJson, "HOLD_HIGH_RISK");
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
