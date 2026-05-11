# KOHEE Active Queue

Last updated: 2026-05-11
Purpose: current blockers and next actions only.

## Read first

- `AGENTS.md`
- this file
- current PR / issue / check logs
- `docs/LOCAL_CODEX_RUNBOOK.md` for `LOCAL_TRACK`
- `docs/KOHEE_MASTER_CONTEXT.md` only when policy or risk is unclear

## Current blockers

### 1. PR #118 legacy manager / manager_pick removal

Status: `HOLD_LOCAL_REQUIRED`
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/118`
Blocker: `scripts/test-unit.mjs` still has legacy direct-handler tests that expect manager-role handler calls to return 200.
Next action: local Codex rewrites the test expectations without restoring manager behavior, then runs full verification.

### 2. Phase 2 webhook delivery

Status: delivery verification pending
Track: `LOCAL_TRACK`
Evidence: `https://kohee-github-app-worker-dry-run.gabefinder.workers.dev/health` passed earlier.
Blocker: GitHub App delivery 200 and Worker dry-run log still need local/account-side verification.
Next action: trigger a harmless event, confirm GitHub App delivery 200, confirm Worker dry-run decision log.

## Next work after blockers

1. command dispatch create-only/no-overwrite
2. command validator
3. read-only maintenance audit
4. admin review console Phase 2/3
5. submissions review CSV Phase 2
6. audit:kohee useful WARN strengthening

## HOLD / do not start without approval

- D1/schema manager role CHECK removal
- manager_pick DB column removal
- resetCsv transaction/staging redesign
- evidence/category verification DB
- auth/session/security redesign
- public `/data` behavior changes
- CSV import/reset semantics
- production deploy workflows/secrets
- GitHub App production write enablement
- automatic branch deletion
- automatic issue close

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
