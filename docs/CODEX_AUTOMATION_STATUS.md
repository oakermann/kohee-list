# KOHEE Automation Status

Last verified: 2026-05-10

This document records the current operating baseline for KOHEE LIST GitHub / Codex / ChatGPT automation. It is a status and runbook document, not a product feature spec.

## Current baseline

The current automation is usable, but it is not fully hands-off.

- ChatGPT GitHub connector is the primary reliable executor for branch, file, pull request, check, review-thread, and merge operations.
- GitHub Actions is the validation and deploy gate.
- Codex Cloud is useful for review, analysis, and direct task PRs, but its self-reports must be checked against GitHub evidence.
- GitHub issue `@codex` triggers can wake Codex, but they are not treated as the primary PR publishing path.
- HIGH-risk work remains HOLD / user-approved only.

## Reliable paths

### ChatGPT GitHub connector

This path has been verified for:

- Creating branches.
- Updating files.
- Opening normal pull requests.
- Reading changed files and patches.
- Reading GitHub Actions checks.
- Reading and resolving review threads.
- Squash-merging pull requests after checks and review threads pass.
- Updating and closing issues.

Operational rule:

- Create normal PRs by default.
- Avoid draft PRs unless the user explicitly asks for draft.
- Merge only after GitHub Actions checks pass and review threads are resolved.

### GitHub Actions validation

The standard PR gate is:

- `PR Validate`
- `Validate`
- `npm run test:unit`
- `npm run audit:kohee`
- KOHEE PR evidence checks where configured

Deploy and smoke verification still follow the existing GitHub Actions deploy workflow rules.

### Status Watchdog

`KOHEE Status Watchdog` is active as a read-only workflow.

It classifies automation issues as:

- `ACTIVE`: long-lived maintenance/control issues.
- `TERMINAL`: completed or held work recorded through `KOHEE_STATUS` body or comments.
- `STALE_QUEUED`: queued automation issues older than the stale threshold without terminal status.
- `OBSERVE`: non-actionable observed issue.

Last verified watchdog state:

- `#23` is `ACTIVE`.
- `#24` is `TERMINAL / HOLD`.
- `stale_queued = 0`.

Regression coverage exists in `scripts/test-watchdog.mjs` and is included in `npm run test:unit`.

## Unreliable or limited paths

### Draft PR ready-for-review transition

The GitHub connector has shown a bug when converting a draft PR to ready-for-review:

```text
GithubGraphQLAPIError:
Field 'htmlUrl' doesn't exist on type 'PullRequest'
```

Workaround:

- Use normal PRs by default.
- Do not create draft PRs unless explicitly needed.

### Issue `@codex` PR publishing

Issue-triggered Codex can respond, but it may not be able to publish an actual PR URL from that execution environment.

Observed status pattern:

```text
HOLD_CODEX_PR_PUBLISHING / UNVERIFIED
```

Operational rule:

- Do not trust issue-triggered Codex PR claims unless an actual GitHub PR URL exists.
- A commit hash, branch name, local task output, or `make_pr` metadata without an actual PR URL is `UNVERIFIED`.

### Direct Codex Cloud task reporting

Direct Codex Cloud can create PRs, but task-local reporting may conflict with GitHub evidence. PR #46 showed that a real GitHub PR existed while task-local text still reported missing origin / publish hold.

Operational rule:

- GitHub evidence wins over Codex self-report.
- PR body must not retain stale `HOLD_CODEX_PR_PUBLISHING` / `UNVERIFIED` language if an actual PR exists.
- `scripts/kohee-evidence-check.mjs` is expected to catch conflicting evidence claims.

## Live automation issues

### Active

- `#23` `KOHEE_CLOUD_MAINTENANCE: Scheduled Codex maintenance`
  - Long-lived maintenance control issue.
  - Keep open as ACTIVE.

### Held

- `#24` `[KOHEE_TASK] Remove legacy manager role safely`
  - HIGH / AUTH_ROLE.
  - Held with `HOLD_USER_APPROVAL`.
  - Do not run automatically.
  - Current project rules still use `admin`, `manager`, and `user`; manager removal requires separate approval and a dedicated migration/permission plan.

### Closed cleanup set

The following smoke/test/parallel issues were completed and closed to keep the watchdog queue clean:

- `#26` deploy smoke verification.
- `#27` manager removal audit.
- `#28` review-result CSV import HOLD audit.
- `#29` admin console UX cleanup.
- `#30` Codex Cloud workflow verification.
- `#31` findings docs cleanup.
- `#33` Codex PR publishing smoke.
- `#36` Codex Cloud automation gates upgrade.
- `#39` dispatch v1.5 smoke test.
- `#45` Codex PR publishing E2E docs smoke.

## Pull requests that established this baseline

- `#38` Command Dispatch workflow.
- `#40` presets and manual `@codex` trigger guidance.
- `#41` Run workflow button restoration.
- `#42` PR Evidence Verifier.
- `#43` bot `@codex` comment noise removal.
- `#44` Status Watchdog.
- `#46` direct Codex Cloud PR publishing smoke finding.
- `#47` conflicting PR evidence hold-claim detection.
- `#48` watchdog active/terminal/stale classification.
- `#49` terminal state detection tightening.
- `#50` watchdog comment `KOHEE_STATUS` support.
- `#51` cloud maintenance ACTIVE classification.
- `#52` watchdog regression tests.

## Operating procedure for future work

1. Classify the task as LOW / MEDIUM / HIGH.
2. Confirm allowed files and denied files before changes.
3. Prefer ChatGPT GitHub connector for actual PR-producing work.
4. Keep direct Codex Cloud tasks evidence-gated.
5. Treat issue `@codex` as analysis / ACK / HOLD unless it produces an actual PR URL.
6. Check actual GitHub PR URL, head SHA, changed files, checks, and review threads.
7. Merge only when checks pass, threads are resolved, and the diff is within scope.
8. Keep HIGH-risk changes as HOLD until the user explicitly approves.

## HIGH-risk areas

The following remain user-approved / HOLD by default:

- D1 schema and migrations.
- Auth, sessions, secrets, and role/permission policy.
- Public `/data` exposure or public API behavior.
- CSV import/reset semantics and review-result CSV upload/import.
- Destructive data behavior.
- Cloudflare deploy workflow behavior and secrets.
- Manager role removal or production access semantics.

## Current automation completion estimate

Current practical automation level:

- GitHub PR execution through ChatGPT connector: high.
- Validation and watchdog coverage: high.
- Direct Codex Cloud autonomous execution: medium, evidence-gated.
- Issue `@codex` as PR publisher: limited.
- Full hands-off LOW/MEDIUM auto-merge: not yet enabled.

Estimated status:

- Practical automation: 80% to 85%.
- Fully hands-off automation: 60% to 65%.
