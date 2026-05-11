# GitHub App Worker Automation Plan

Status: design only  
Risk: LOW / GOVERNANCE  
Last updated: 2026-05-10

This document describes a future GitHub App + Cloudflare Worker automation bot for KOHEE LIST. It does not enable any live automation by itself.

## Goal

Reduce repetitive GitHub operations while keeping HIGH-risk work under explicit user approval.

The bot should eventually handle safe, mechanical work:

- Detect merged PRs and close completed issues.
- Keep HOLD issues from becoming stale watchdog noise.
- Detect duplicate command issues.
- Enable GitHub native auto-merge for safe LOW/MEDIUM PRs.
- Block or warn on HIGH-risk paths.
- Summarize batch issue status.

The bot is not an AI coding agent. It should not design or modify application code.

## Non-goals

Phase 1 must not:

- Modify repository contents.
- Deploy Cloudflare Workers.
- Install or activate a production GitHub App.
- Register secrets.
- Call OpenAI API.
- Apply D1 migrations.
- Change KOHEE runtime server/API/frontend behavior.
- Change Cloudflare Pages/Workers deploy behavior.
- Auto-merge HIGH-risk PRs.
- Auto-close issues without dry-run evidence.

## Roles

### User

- Approves HIGH-risk work.
- Decides product and permission policy.
- Does not need to click for routine LOW/MEDIUM safe merges once the bot is live.

### ChatGPT

- Plans work.
- Creates or updates batch issues.
- Integrates safe patches into one branch when practical.
- Opens actual GitHub PRs.
- Handles Codex Review comments.
- Keeps HIGH-risk work on HOLD until approved.

### Codex

- Analyzes issue tasks.
- Produces `PATCH_READY`, `DONE_NO_DEPLOY`, `HOLD_USER_APPROVAL`, or `HOLD_HIGH_RISK` findings.
- Reviews PR diffs through Codex Review.
- Must not claim `PR_OPEN` without an actual GitHub PR URL.

### GitHub Actions

- Runs PR Validate and Validate.
- Runs unit tests, KOHEE audit, and PR evidence checks.
- Remains the validation gate before merge.

### GitHub App + Cloudflare Worker bot

- Receives GitHub webhooks.
- Verifies webhook signatures.
- Reads PR/issue/check state.
- Applies safe mechanical decisions.
- Writes issue comments, closes completed issues, and enables native auto-merge when safe.
- Never bypasses branch protection or required checks.

## Architecture

```text
GitHub webhook
  -> Cloudflare Worker /github/webhook
  -> verify signature + delivery id
  -> classify event
  -> fetch PR/issue/check evidence with GitHub App installation token
  -> decide dry-run action
  -> optionally execute safe action in later phases
  -> write audit log
```

The Worker should start in dry-run mode only.

## GitHub App permissions

Start with the smallest useful permission set.

### Permission matrix

| Permission | Phase 1 dry-run | Phase 2 comments | Phase 4 auto-merge | Rationale |
|---|---:|---:|---:|---|
| Metadata | read | read | read | Required by GitHub Apps. |
| Contents | read | read | read | Read changed files and denylist matches. Never write in this design. |
| Issues | read | write | write | Read batch/command issues; later comment/close completed or duplicate issues. |
| Pull requests | read | read | write | Read PR state and changed files; later enable native auto-merge only for safe PRs. |
| Checks | read | read | read | Confirm check status before any merge-related decision. |
| Actions | read | read | read | Inspect workflow_run status when needed. |
| Administration | none | none | none | Not needed; branch protection must remain external. |
| Secrets | none | none | none | Never manage secrets from this bot. |
| Deployments | none | none | none | No deploy behavior in this design. |
| Contents write | none | none | none | Explicitly forbidden unless a separate HIGH-risk design is approved. |

Required for Phase 1 dry-run:

- Metadata: read
- Contents: read
- Issues: read
- Pull requests: read
- Checks: read
- Actions: read

Required for Phase 2 mechanical issue comments:

- Issues: write

Required for Phase 4 native auto-merge enablement:

- Pull requests: write

Do not grant initially:

- Contents: write
- Administration: write
- Secrets: write
- Actions: write
- Deployments: write

`contents: write` should remain unavailable unless a separate HIGH-risk design is approved.

## Webhook events

Phase 1 dry-run can listen to:

- `pull_request`
  - opened
  - reopened
  - synchronize
  - closed
- `check_suite`
  - completed
- `workflow_run`
  - completed
- `issue_comment`
  - created
- `issues`
  - opened
  - edited
  - closed
  - reopened
- `pull_request_review`
  - submitted

The handler must ignore events from its own bot identity unless explicitly needed for idempotent confirmation.

## High-risk denylist

The bot must never auto-merge or auto-resolve policy gates when a PR or issue touches these areas:

- `migrations/**`
- `schema.sql`
- `wrangler.toml`
- `.github/workflows/**` when deploy behavior or permissions change
- `server/auth.js`
- `server/security.js`
- session, cookie, CSRF, password, role, or secret logic
- public `/data` exposure or public API response shape
- CSV import/reset semantics
- destructive data behavior
- Cloudflare secrets or deploy permissions
- manager role removal or production access policy

If any denylist item is detected, the bot should comment `HOLD_USER_APPROVAL` or `HOLD_HIGH_RISK` and avoid auto-merge.

## Safe auto-merge eligibility

A PR may be eligible for native auto-merge only if all are true:

- PR is not draft.
- PR is LOW or MEDIUM.
- PR changed files are outside the high-risk denylist.
- PR body includes scope and safety notes.
- PR has no unresolved review threads at the time of action.
- Required checks are pending or passing.
- PR is not authored by an untrusted actor.
- PR is not trying to change branch protection, secrets, D1, auth, public API, CSV import/reset, or deploy permissions.

Eligible examples:

- Docs-only changes.
- Test-only changes.
- Audit/tooling changes.
- Route comments with no behavior change.
- CSV export-only hardening without import/reset changes.
- Frontend rendering cleanup that does not touch auth/session/permissions.

The bot should enable GitHub native auto-merge, not create a custom merge implementation.

## Issue cleanup rules

When a PR merges, the bot may dry-run or later perform:

- Find linked issues from PR body.
- Add `KOHEE_STATUS` completion comment.
- Close completed command issues.
- Mark duplicates as duplicate when evidence is explicit.
- Leave HIGH-risk policy issues open as HOLD.

Completed issue comment example:

```yaml
KOHEE_STATUS:
  state: DONE_NO_DEPLOY
  risk: MEDIUM
  lane: CSV_PIPELINE
  owner: kohee-list-automation
  result: Completed via merged PR #123.
  evidence:
    merged_pr: PR #123
  final_action: close_issue
```

HOLD issue comment example:

```yaml
KOHEE_STATUS:
  state: HOLD
  risk: HIGH
  lane: AUTH_ROLE
  owner: kohee-list-automation
  blocker: HOLD_USER_APPROVAL
  runtime_change_allowed: false
```

## Batch issue rules

Prefer one `[KOHEE_BATCH]` issue for related work.

The bot can summarize:

- Done subtasks.
- Held subtasks.
- Merged PRs.
- Duplicate child issues.
- Remaining user approvals.

The bot should not create large numbers of child issues by itself.

## Codex issue response handling

The bot can classify Codex comments as:

- `PATCH_READY`
- `DONE_NO_DEPLOY`
- `HOLD_USER_APPROVAL`
- `HOLD_HIGH_RISK`
- `UNVERIFIED_PR_CLAIM`

If a Codex comment claims PR success without an actual GitHub PR URL, the bot should mark it as unverified and avoid any merge or close action.

## Security controls

Required before live use:

- Verify `X-Hub-Signature-256` using `GITHUB_WEBHOOK_SECRET`.
- Reject unsigned or malformed webhook requests.
- Apply a replay window check where a timestamp is available; otherwise rely on delivery-id dedupe and short retention.
- Validate event `repository.full_name === "oakermann/kohee-list"`.
- Validate GitHub App `installation.id` against an allowlist.
- Store and de-duplicate `X-GitHub-Delivery` ids with a TTL.
- Parse webhook payloads with strict event schemas and fail closed on unknown shapes.
- Ignore self-triggered bot loops.
- Use GitHub App installation tokens, not a long-lived personal token.
- Keep app private key in Cloudflare secrets.
- Use deny-by-default for unknown events.
- Dry-run by default.
- Log all decisions.
- Do not print secrets or tokens.
- Add rate limiting/backoff for GitHub API errors.
- Treat missing evidence as HOLD, not success.

## Loop prevention and idempotency

The bot must avoid event storms and self-triggered loops.

Required controls:

- Ignore events authored by the bot account unless the event is explicitly allowed for confirmation.
- Use `installation_id + delivery_id` as the primary idempotency key.
- Record event action, repository, issue/PR number, head SHA, and decision in the audit log.
- Do not process the same delivery id twice.
- Add a max retry count for GitHub API failures.
- Use exponential backoff for transient GitHub API errors.
- Record failed non-retryable events as HOLD or ERROR, not as success.
- Keep a global dry-run flag and a global kill switch.

## Kill switch and safety flags

Before live use, the Worker must support:

- `KOHEE_BOT_ENABLED=false` to disable all write actions.
- `KOHEE_BOT_DRY_RUN=true` as the default mode.
- `KOHEE_BOT_AUTO_MERGE_ENABLED=false` to disable auto-merge enablement.
- `KOHEE_BOT_ISSUE_CLOSE_ENABLED=false` to disable issue closing.
- `KOHEE_BOT_ALLOWED_REPOS=oakermann/kohee-list` to restrict repositories.

If a flag is missing, the bot should choose the safer behavior.

## Metrics

Track at least these metrics before enabling non-dry-run actions:

- Webhook events received by type.
- Events ignored as duplicates.
- Events ignored as bot-authored self-events.
- Safe auto-merge eligible decisions.
- HOLD decisions by reason.
- False-positive HOLDs found during review.
- Issue cleanup eligible decisions.
- Issue cleanup skipped decisions.
- GitHub API error rate.
- Median time from PR merge to issue cleanup.
- Median time from PR open to auto-merge enable decision.

Phase 4 should not start until dry-run metrics show low false positives.

## Cloudflare Worker endpoints

Initial dry-run endpoints:

- `GET /health`
  - Returns bot version and dry-run status.
- `POST /github/webhook`
  - Receives GitHub webhook events.
  - Verifies signature.
  - Returns a dry-run decision object.

No public KOHEE LIST user traffic should hit this Worker.

## Dry-run decision examples

Safe PR:

```json
{
  "ok": true,
  "dryRun": true,
  "event": "pull_request.opened",
  "decision": "SAFE_AUTO_MERGE_ELIGIBLE",
  "wouldDo": ["enable_native_auto_merge"]
}
```

High-risk PR:

```json
{
  "ok": true,
  "dryRun": true,
  "event": "pull_request.opened",
  "decision": "HOLD_HIGH_RISK",
  "reasons": ["changed file: schema.sql"],
  "wouldDo": ["comment_hold_user_approval"]
}
```

Merged PR cleanup:

```json
{
  "ok": true,
  "dryRun": true,
  "event": "pull_request.closed",
  "merged": true,
  "decision": "ISSUE_CLEANUP_ELIGIBLE",
  "wouldDo": ["comment_done", "close_linked_issues"]
}
```

## Rollout plan

### Phase 0: docs only

- Add this plan.
- No code.
- No GitHub App installation.
- No Worker deployment.

### Phase 1: local/dry-run skeleton

- Add Worker skeleton under a separate automation directory.
- Add mock webhook tests.
- No Cloudflare deployment.
- No secrets.
- No GitHub API writes.

### Phase 2: deployed dry-run

- Create GitHub App with read-only permissions plus issues/pull-request write only if needed for dry-run comments.
- Deploy Worker to Cloudflare.
- Enable webhook on test repo or restricted test installation first.
- Log decisions only.
- No auto-merge or issue close execution.

### Phase 3: mechanical cleanup

- Allow issue comments and issue close for completed/duplicate issues.
- Keep auto-merge dry-run.

### Phase 4: safe native auto-merge

- Enable native auto-merge only for safe LOW/MEDIUM PRs.
- Keep denylist strict.
- HIGH-risk remains HOLD.

### Phase 5: review and expand

- Consider more events only after stable operation.
- Do not add code-writing permission without a separate HIGH-risk review.

## Success criteria

The bot is successful if it reduces manual GitHub clicks without weakening safety gates:

- Safe PRs are auto-merge-enabled when appropriate.
- Completed issues are closed with evidence.
- HOLD issues remain visible and are not stale.
- HIGH-risk work is never auto-merged.
- No production code changes occur from the bot itself.
- All actions are explainable from GitHub comments/logs.

## Current recommendation

Proceed only through Phase 0 and Phase 1 first.

Do not connect the bot to production GitHub App or Cloudflare Worker runtime until dry-run tests prove:

- signature verification works,
- denylist classification works,
- loop prevention works,
- issue cleanup decisions are correct,
- safe auto-merge eligibility is conservative.
