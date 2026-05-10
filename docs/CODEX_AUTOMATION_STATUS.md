# KOHEE Automation Status

Last verified: 2026-05-10

This document records the current KOHEE LIST GitHub / Codex / ChatGPT automation baseline. The source of truth is [`docs/KOHEE_MASTER_CONTEXT.md`](KOHEE_MASTER_CONTEXT.md). If this document conflicts with the master context, follow the master context unless the user gives a newer explicit instruction.

## Current baseline

The current operating model is ChatGPT-main.

- ChatGPT GitHub connector is the primary executor and orchestrator for normal KOHEE LIST work.
- GitHub Actions is the validation and deploy gate.
- Codex Cloud is reviewer / analysis / PATCH_READY support, not the default completion authority.
- Codex Cloud self-reports must be checked against GitHub evidence.
- GitHub issue `@codex` triggers can request analysis or patch preparation, but are not treated as the primary PR publishing path.
- LOW/MEDIUM work should be parallelized when safe: no overlapping files, no overlapping risk areas, no shared-test-file conflict, and explicit sequential merge order.
- LOW/MEDIUM safe PRs may use GitHub native auto-merge or connector merge when checks and review-thread requirements are satisfied.
- HIGH-risk work remains HOLD / user-approved only.
- Routine maintenance is centered on issue `#23`; scheduled fan-out to multiple queued maintenance issues is disabled.
- Legacy manager runtime/admin access was removed by PR `#81`; physical D1/schema cleanup is a separate migration decision if needed later.
- GitHub App + Cloudflare Worker Phase 2 connection is deferred until the user explicitly starts it.

## Reliable paths

### ChatGPT GitHub connector

This path is the default executor path for:

- Creating branches.
- Updating files.
- Opening normal pull requests.
- Reading changed files and patches.
- Reading GitHub Actions checks.
- Reading and resolving review threads.
- Enabling native auto-merge for safe PRs when allowed by repository settings.
- Squash-merging pull requests after checks and review threads pass.
- Updating and closing issues.

Operational rule:

- Create normal PRs by default.
- Avoid draft PRs unless the user explicitly asks for draft.
- For LOW/MEDIUM tasks, use parallel PRs when files and risk areas do not overlap.
- Merge safe parallel PRs sequentially after verification.
- Enable GitHub native auto-merge only after changed-file, evidence, and review-thread checks are acceptable.
- Do not enable auto-merge for HIGH-risk runtime/policy PRs.
- Manual connector merge remains acceptable if native auto-merge is unavailable.

### GitHub Actions validation

The standard PR gate is:

- `PR Validate`
- `Validate`
- `npm run test:unit`
- `npm run audit:kohee`
- KOHEE PR evidence checks where configured

Deploy and smoke verification still follow the existing GitHub Actions deploy workflow rules.

### Codex support workflow

Codex is support, not final authority.

Allowed Codex roles:

- PR review.
- Failure analysis.
- PATCH_READY preparation.
- Local authenticated control-plane execution only when explicitly required and the environment has the required tools, such as Phase 2 GitHub App + Cloudflare setup.

Issue-triggered Codex should report `PATCH_READY`, `DONE_NO_DEPLOY`, `HOLD_USER_APPROVAL`, or `HOLD_HIGH_RISK`. It must not claim `PR_OPEN` without an actual GitHub PR URL.

### Manual Codex Cloud maintenance workflow

`KOHEE Codex Cloud Maintenance` is manual-only after PR `#79`.

Current behavior:

- No daily schedule.
- No creation of separate scheduled parallel maintenance issues.
- Default manual run records a maintenance note on `#23` only.
- `trigger_codex=true` posts one explicit analysis-only `@codex` request on `#23`.

### Status Watchdog

`KOHEE Status Watchdog` is active as a read-only workflow.

It classifies automation issues as:

- `ACTIVE`: long-lived maintenance/control issues.
- `TERMINAL`: completed or held work recorded through `KOHEE_STATUS` body or comments.
- `STALE_QUEUED`: queued automation issues older than the stale threshold without terminal status.
- `OBSERVE`: non-actionable observed issue.

Last verified watchdog state:

- `#23` is `ACTIVE`.
- `#71` through `#77` were closed as superseded after PR `#79`.
- Expected `stale_queued = 0`.

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

Operational rule:

- Do not trust issue-triggered Codex PR claims unless an actual GitHub PR URL exists.
- A commit hash, branch name, local task output, or `make_pr` metadata without an actual PR URL is `UNVERIFIED`.

### Direct Codex Cloud task reporting

Direct Codex Cloud can create PRs, but task-local reporting may conflict with GitHub evidence.

Operational rule:

- GitHub evidence wins over Codex self-report.
- PR body must not retain stale `HOLD_CODEX_PR_PUBLISHING` / `UNVERIFIED` language if an actual PR exists.
- `scripts/kohee-evidence-check.mjs` is expected to catch conflicting evidence claims.

## Parallel execution policy

Default to parallel execution for safe LOW/MEDIUM tasks.

Parallel is allowed for:

- docs-only work
- wording-only work
- audit-only work
- isolated tests/guards
- isolated tooling
- independent frontend copy changes
- independent governance documentation

Parallel requirements:

1. Files do not overlap.
2. Risk areas do not overlap.
3. Shared tests such as `scripts/test-unit.mjs` are not touched by multiple lanes.
4. Each lane has explicit scope, denylist, verification, and merge order.
5. Merge happens sequentially after checks and review threads pass.
6. Branches are updated/rechecked after upstream merges when needed.

Do not parallelize:

- HIGH/HOLD work
- D1/schema/migrations
- auth/session/security
- public `/data` or public API exposure behavior
- CSV import/reset semantics
- destructive data behavior
- Cloudflare production deploy workflow/secrets
- GitHub App + Cloudflare control-plane connection
- manager role removal work touching shared auth/server/tests
- same-file changes

## Auto-merge policy

Use GitHub native auto-merge to reduce manual clicks for safe PRs.

Auto-merge is allowed for:

- Docs-only changes.
- Test-only changes.
- Audit/tooling changes.
- Route comments or governance clarity with no runtime behavior change.
- Frontend rendering cleanup that does not change auth/session/permissions.
- CSV export-only changes that do not touch import/reset semantics.
- LOW/MEDIUM maintenance PRs after allowed/denied file review.

Auto-merge is not allowed for:

- D1 schema or migrations.
- Auth, sessions, secrets, or role/permission policy.
- Public `/data` exposure or public API behavior.
- CSV import/reset semantics or review-result CSV upload/import.
- Destructive data behavior.
- Cloudflare deploy workflow behavior or secrets.
- Physical legacy manager D1/schema enum cleanup, if pursued later.
- Any PR with unresolved review threads or unclear changed files.

Operational flow:

1. Open normal PRs for safe parallel lanes when appropriate.
2. Check changed files and PR body evidence.
3. Confirm each PR is LOW/MEDIUM and outside the auto-merge denylist.
4. Enable GitHub native auto-merge before checks finish when safe, or use connector merge after checks pass.
5. Merge sequentially according to the declared merge order.
6. Record DONE/HOLD status in the batch or control issue after merge.

Do not create a separate custom auto-merge workflow unless explicitly approved. Native GitHub auto-merge is preferred because repository branch protection and required checks remain the gate.

## Live automation issues

### Active

- `#23` `KOHEE_CLOUD_MAINTENANCE: Manual Codex maintenance control`
  - Long-lived maintenance control issue.
  - Keep open as ACTIVE.
  - Use this as the single routine maintenance control issue.

### Completed or closed cleanup set

The following items are completed or superseded:

- `#24` legacy manager role runtime/admin access removal, completed by PR #81.
- `#59` manager approved/public cafe edit policy, superseded by PR #81 because manager no longer has operational API access.
- `#71` through `#77` scheduled parallel maintenance fan-out issues, superseded by PR #79.

## Pull requests that established this baseline

- `#38` Command Dispatch workflow.
- `#40` presets and manual `@codex` trigger guidance.
- `#42` PR Evidence Verifier.
- `#44` Status Watchdog.
- `#46` direct Codex Cloud PR publishing smoke finding.
- `#47` conflicting PR evidence hold-claim detection.
- `#52` watchdog regression tests.
- `#61` review CSV export formula guard and route grouping clarity.
- `#62` API cafe category whitelist.
- `#79` manual-only Codex Cloud maintenance workflow and parallel fan-out removal.
- `#81` legacy manager runtime/admin access removal.
- `#83` user-facing operator username redaction.
- `#85` GitHub App Worker Phase 2 dry-run preparation.
- `#88` policy guard coverage.

## Operating procedure for future work

1. Classify the task as LOW / MEDIUM / HIGH.
2. For LOW/MEDIUM, check whether it can run in parallel with active lanes.
3. Prefer a single batch issue for related work.
4. Confirm allowed files and denied files before changes.
5. Prefer ChatGPT GitHub connector for actual PR-producing work.
6. Keep Codex Cloud tasks evidence-gated.
7. Treat issue `@codex` as analysis / PATCH_READY / HOLD unless it produces an actual PR URL.
8. Check actual GitHub PR URL, head SHA, changed files, checks, and review threads.
9. Enable native auto-merge or use connector merge for safe LOW/MEDIUM PRs when available.
10. Merge parallel PRs sequentially.
11. Keep HIGH-risk changes as HOLD until the user explicitly approves.

## HIGH-risk areas

The following remain user-approved / HOLD by default:

- D1 schema and migrations.
- Auth, sessions, secrets, and role/permission policy.
- Public `/data` exposure or public API behavior.
- CSV import/reset semantics and review-result CSV upload/import.
- Destructive data behavior.
- Cloudflare deploy workflow behavior and secrets.
- GitHub App write enablement.
- GitHub App issue-close enablement.
- GitHub App auto-merge enablement.
- Physical legacy manager D1/schema enum cleanup, if pursued later.
- resetCsv staging/transaction redesign.
- evidence DB design/migration.

## Current automation completion estimate

Current practical automation level:

- GitHub PR execution through ChatGPT connector: high.
- Validation and watchdog coverage: high.
- Native auto-merge / connector merge for safe PRs: enabled operationally when repository settings and checks allow it.
- Direct Codex Cloud autonomous execution: medium, evidence-gated.
- Issue `@codex` as PR publisher: limited.
- Fully hands-off HIGH-risk automation: not enabled.

Estimated status:

- Practical automation: 85% to 90%.
- Fully hands-off automation: 65% to 70%.
