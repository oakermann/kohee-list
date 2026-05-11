# Local Codex Runbook

Status: active routing note

## Read order

1. `AGENTS.md`
2. `docs/KOHEE_MASTER_CONTEXT.md`
3. `docs/KOHEE_ACTIVE_QUEUE.md`
4. issue `#23` latest comments
5. open PRs marked `HOLD_LOCAL_REQUIRED`

## Current first task

PR #118: `https://github.com/oakermann/kohee-list/pull/118`

Goal: finish legacy manager and manager_pick removal without restoring manager behavior.

## Local workflow

1. Inspect the target PR body and latest failed checks.
2. Fix only the recorded blocker.
3. Run verification.
4. Commit and push to the target branch.
5. Record a short result in `docs/audits/LOCAL_CODEX_AUDIT_LOG.md`.
6. Add a short status comment to the target PR or issue `#23`.

## Guardrails

Do not change D1 migrations, `schema.sql`, `migrations/**`, auth/session/security behavior, public `/data` exposure rules, CSV import/reset semantics, or production deploy/secrets.

## Checks

- `npm run check:deploy-sync`
- `npm run test:unit`
- `npm run audit:kohee`
- `npm run verify:release`
- `git diff --check`

## Result format

Status / Changed files / Tests / Remaining risks / Next action / Evidence
