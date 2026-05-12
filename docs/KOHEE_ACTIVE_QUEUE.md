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

### PR #134 command validator

Status: pending PR
Track: `LOCAL_TRACK`
Evidence: pending GitHub PR
Result: command validator is being rebuilt as a local/CI test without custom commit statuses. It checks KOHEE_COMMAND schema fields, state/risk/lane/HOLD vocabulary, dispatch create-only behavior, PR evidence fields, and absence of custom commit status publishing APIs.

### PR #132 command dispatch create-only/no-overwrite

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/132`
Merge commit: `6f00354f62cfd2b9dc93c40fd3e39b65de7985b1`
Result: command dispatch workflow now creates a new KOHEE command issue or fails on an existing matching open command, instead of overwriting command issue content. Manual `@codex` guidance is preserved.

### PR #128 commercial codebase gap audit

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/128`
Merge commit: `93c70636bb044cf291b8831872dd35a9251fcc04`
Result: added audit-only commercial codebase gap report under `docs/audits/`. PR Validate and Validate passed before merge.

### PR #129 public smoke retired manager_pick guard

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/129`
Merge commit: `e27321e9fb88b49ef5e8912fdf787e6bf54cf23d`
Result: tightened smoke/audit tooling so retired `manager_pick` cannot return to the public smoke allowlist unnoticed. No runtime public `/data` implementation changed.

### PR #130 smoke command safety runbook

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/130`
Merge commit: `bd4851361f07c9d77f09f7d7efdf0162bc5dabfe`
Result: documented read-only smoke commands versus the approval-required production-adjacent full smoke command.

### PR #118 legacy manager / manager_pick removal

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/118`
Merge commit: `0e4eb8324c2e36b9bdeedd4538a29d4c68a76114`
Result: legacy manager direct-handler unit-test blocker was repaired without restoring manager behavior. PR Validate and Validate passed on PR head `a030933fcd81683d52607847f8d70c7c1b9a4211` before merge.

### Phase 2 webhook delivery

Status: verified dry-run delivery
Track: `LOCAL_TRACK`
Evidence: issue `#23` comment `4428758548` produced Worker delivery `e9755cd0-4ddd-11f1-9dde-08393d66756c`.
Result: GitHub App `issue_comment` delivery reached the dry-run Worker and emitted `decision=OBSERVE`, `wouldDo=["record_status"]`, `botEnabled=false`, `dryRun=true`.

## Current blockers

### 1. Remote merged branch cleanup

Status: `HOLD_USER_APPROVAL`
Track: `LOCAL_TRACK`
Evidence: issue `#23` status comment `4429263918`; issue `#94` governance follow-up.
Blocker: deleting remote branches is intentionally not automatic.
Verified merged remote branch candidates:

- `origin/chatgpt/dispatch-overwrite-protection`
- `origin/chatgpt/fix-webhook-secret-name`
- `origin/codex/add-kohee-command-dispatch-workflow`
- `origin/codex/fix-issue-#36-github-pr-handling`
- `origin/codex/improve-kohee-command-dispatch-workflow`
- `origin/docs-role`
- `origin/docs-role-clean`
- `origin/docs-role-cleanup`
- `origin/phase3-plan-docs`
- `origin/queue-state-docs`
- `origin/role-server`

Next action: if the owner explicitly approves branch deletion, delete only the verified merged remote branches above and record the command evidence. Otherwise leave them as candidates only.

## Next work after blockers

1. read-only maintenance audit
2. Phase 3 safe issue-comment bridge
3. Phase 4 native auto-merge enablement for safe PRs only
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
- direct merge bot fallback
- merge queue adoption

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
