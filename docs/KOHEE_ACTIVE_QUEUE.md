# KOHEE Active Queue

Last updated: 2026-05-12
Purpose: current blockers and next actions only.

## Read first

- `AGENTS.md`
- this file
- current PR / issue / check logs
- `docs/LOCAL_CODEX_RUNBOOK.md` for `LOCAL_TRACK`
- `docs/KOHEE_MASTER_CONTEXT.md` only when policy or risk is unclear

## Confirmed automation direction

- GitHub is the source of truth: PRs, checks, review threads, issue #23, and logs.
- Hot path stays short: `AGENTS.md` -> `KOHEE_ACTIVE_QUEUE.md` -> current PR/check/issue.
- Local Codex should use one git worktree per active independent lane.
- Do not run parallel lanes that touch the same file, same shared test file, or same risk area.
- Worker automation should be staged: Phase 3 comment/status bridge first, Phase 4 native GitHub auto-merge later.
- GitHub Actions/rulesets remain the final gate; Worker must not bypass checks.

## Recently completed

### PR #118 legacy manager / manager_pick removal

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/118`
Merge commit: `0e4eb8324c2e36b9bdeedd4538a29d4c68a76114`
Result: legacy manager direct-handler unit-test blocker was repaired without restoring manager behavior. PR Validate and Validate passed on PR head `a030933fcd81683d52607847f8d70c7c1b9a4211` before merge.

## Current blockers

### 1. Phase 2 webhook delivery

Status: delivery verification pending
Track: `LOCAL_TRACK`
Evidence: `https://kohee-github-app-worker-dry-run.gabefinder.workers.dev/health` passed earlier.
Blocker: GitHub App delivery 200 and Worker dry-run log still need local/account-side verification.
Next action: trigger a harmless event, confirm GitHub App delivery 200, confirm Worker dry-run decision log.

### 2. Commercial codebase gap audit

Status: queued
Track: `LOCAL_TRACK`
Evidence: issue `#23` task queue comment.
Blocker: not started.
Next action: create an audit-only Draft PR with one report under `docs/audits/`.

## Next work after blockers

1. command dispatch create-only/no-overwrite
2. command validator
3. read-only maintenance audit
4. Phase 3 safe issue-comment bridge
5. Phase 4 native auto-merge enablement for safe PRs only
6. admin review console Phase 2/3
7. submissions review CSV Phase 2
8. audit:kohee useful WARN strengthening

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
- direct merge bot fallback
- merge queue adoption

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
