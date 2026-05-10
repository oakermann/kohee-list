# KOHEE LIST Agent Contract

This repo is KOHEE LIST.

Read these first, in order:

1. `docs/KOHEE_MASTER_CONTEXT.md`
2. `kohee.contract.json`
3. `docs/CODEX_AUTOMATION_STATUS.md`
4. `docs/CODEX_WORKFLOW.md`

`docs/KOHEE_MASTER_CONTEXT.md` is the current source of truth for automation, lifecycle, CSV, deployment, risk, and backlog rules. If older docs conflict with it, follow the master context unless the user gives a newer explicit instruction.

Use exact file/function allowlists.

No broad refactor.

No manager expansion.

No `aaa/aaaa`.

No deploy unless explicitly requested.

Do not apply D1 migrations.

Report format must include:

```text
Risk / Lane / Commit or PR / Changed files / Changed functions / Tests / Remaining risks
```

## KOHEE GITHUB COMMAND BRIDGE

GitHub is the command bridge, task ledger, evidence store, and CI/review/deploy gate.

GitHub evidence wins. Codex self-reports are status notes, not final truth.

## Current automation roles

- User gives product direction, HIGH-risk approval, and HOLD release decisions.
- ChatGPT GitHub connector is the main executor and orchestrator for normal KOHEE LIST work.
  - Plans the task.
  - Creates branches.
  - Edits files.
  - Opens PRs.
  - Reads diffs, changed files, checks, and review threads.
  - Merges safe PRs after GitHub evidence is verified.
  - Updates issues and reports concise status to the user.
- GitHub Actions is the validation/deploy gate.
- Codex is reviewer, analysis support, and PATCH_READY support.
  - Codex may prepare patches, analyze failures, or review PRs.
  - Codex is not the default completion authority.
  - Codex Cloud self-reports must be verified against actual GitHub evidence.
- GitHub App + Cloudflare Worker automation is a future execution layer for reducing approval clicks.
  - It follows ChatGPT/GitHub evidence decisions.
  - It must remain dry-run until explicitly promoted.
  - It must not bypass GitHub Actions.

For issue-triggered Codex work, Codex should report `PATCH_READY`, `DONE_NO_DEPLOY`, `HOLD_USER_APPROVAL`, or `HOLD_HIGH_RISK` unless it has an actual GitHub PR URL.

Codex must not report `PR_OPEN` from `make_pr` metadata, local commits, branch names, or task-local output without an actual GitHub PR URL.

## Evidence rule

Before ChatGPT reports completion to the user, ChatGPT must verify actual GitHub state:

- PR state
- head SHA
- changed files
- actual diff
- GitHub checks
- Codex review P1/P2 findings when available
- unresolved review threads
- root/.pages-deploy sync when frontend changed
- asset cache-bust when assets changed
- HIGH-risk paths/topics
- deploy status when applicable

If verification was not performed, status is `UNVERIFIED`, not complete. If Codex status conflicts with GitHub evidence, GitHub evidence wins.

## Parallel execution default

Default to parallel execution for LOW/MEDIUM tasks when safe.

Parallel is allowed when:

- risk is LOW or MEDIUM
- files do not overlap
- risk areas do not overlap
- shared tests such as `scripts/test-unit.mjs` are not touched by multiple lanes
- each lane has explicit scope, denylist, verification, and merge order
- merge happens sequentially after checks and review threads pass

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

For safe LOW/MEDIUM PRs created and verified through ChatGPT GitHub connector, GitHub native auto-merge may be enabled after changed-file, evidence, and review-thread checks. Repository required checks remain the merge gate.

HIGH-risk changes, D1/schema/migrations, auth/session/security, public `/data` or public API behavior, CSV import/reset semantics, destructive data, Cloudflare deploy/secrets, manager role removal, and production access policy must stay HOLD/user-approved and must not use auto-merge.

Codex must inspect checks and Codex review P1/P2 findings when available. If checks/reviews are pending, unavailable, or not checked, report that state instead of success.

Codex must fix safe LOW/MEDIUM failures in the same branch. Repeated failures require root-cause analysis, not blind retry.

HIGH-risk changes, unexpected scope expansion, permission/secret blockers, deploy blockers, product-direction questions, and verification conflicts must become `HOLD`.

`KOHEE_COMMAND.allowed_files` may override lane defaults only when explicitly recorded in GitHub. File override cannot waive HIGH-risk approval or HOLD requirements.

`QUEUED_STALE` must not be inferred from elapsed time alone; it requires no `KOHEE_STATUS` update, no PR activity, and no acknowledgement evidence.
