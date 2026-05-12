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

### PR #141 maintenance audit stable invariants

Status: merged
Track: `LOCAL_TRACK`
Evidence: https://github.com/oakermann/kohee-list/pull/141 merged as `a2ca4cae4663df9a7c39504f62a2dcaf354e3d52`; PR checks passed; main Validate and Deploy passed on merge commit, with Deploy skipping Pages/Worker deploy and smoke steps.
Result: `scripts/audit-maintenance-readonly.mjs` no longer asserts transient ACTIVE_QUEUE text. The audit validates stable workflow/package/audit-log invariants and required file existence only.

### PR #136 read-only maintenance audit

Status: merged
Track: `LOCAL_TRACK`
Evidence: https://github.com/oakermann/kohee-list/pull/136 merged as `9570b9e28cf6838c99a7e005a3230d307d88f9f8`; PR checks passed after PR body evidence correction; main Validate and Deploy passed on merge commit, with Deploy skipping Pages/Worker deploy and smoke steps.
Result: scheduled maintenance is narrowed to a read-only audit with no issue writes, CSV backup/export, or artifact upload. The audit runs through `npm run audit:maintenance` and is covered by `npm run test:unit`.
Follow-up: `scripts/audit-maintenance-readonly.mjs` still asserts ACTIVE_QUEUE text; remove that transient queue assertion before broader automation work.

### PR #134 command validator

Status: merged
Track: `LOCAL_TRACK`
Evidence: `https://github.com/oakermann/kohee-list/pull/134`
Merge commit: `3aaa7f874f1da63cd4b6a65f40d99c1b18f1d4ef`
Result: command validator now runs as a local/CI test without custom commit statuses. It checks KOHEE_COMMAND schema fields, state/risk/lane/HOLD vocabulary, dispatch create-only behavior, PR evidence fields, and absence of custom commit status publishing APIs.

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

1. Cloudflare Worker observability audit
   - Risk: LOW audit-only first
   - Track: `LOCAL_TRACK`
   - Lane: AUTOMATION_CONNECTIVITY / DEPLOY_SAFETY
   - Scope: inspect dry-run Worker logging/observability settings and recommend whether to add Cloudflare Workers Logs config. Do not deploy or change secrets.
   - Evidence: Cloudflare Workers Logs can collect, store, filter, and analyze Worker logs in the dashboard; Cloudflare also documents real-time logs and tailing for deployed Workers.
2. GitHub dependency review audit
   - Risk: LOW audit-only first
   - Track: `LOCAL_TRACK`
   - Lane: DEPLOY_SAFETY / SUPPLY_CHAIN
   - Scope: inspect whether dependency-review-action is useful for KOHEE PRs. Propose workflow changes only if low-noise and compatible with current rulesets.
3. Phase 3 safe issue-comment bridge
   - Risk: MEDIUM/HIGH depending on write behavior
   - Track: `LOCAL_TRACK`
   - Lane: AUTOMATION_CONNECTIVITY
   - Scope: design and implement only safe dry-run/status-comment behavior first. No issue close, branch delete, direct merge bot, or ruleset bypass.
4. Phase 4 native auto-merge enablement for safe PRs only
   - Risk: HIGH until Phase 3 is proven
   - Track: `LOCAL_TRACK`
   - Lane: AUTOMATION_CONNECTIVITY
   - Scope: audit/design first. Do not enable production writes without explicit approval.
5. Admin review console Phase 2/3
6. Submissions review CSV Phase 2
7. audit:kohee useful WARN strengthening
8. Artifact attestation audit
   - Risk: LOW audit-only / MEDIUM if workflow changes are proposed
   - Track: `LOCAL_TRACK`
   - Lane: SUPPLY_CHAIN
   - Scope: later candidate only. GitHub artifact attestations can provide build provenance/integrity, but KOHEE currently has higher-priority governance and automation safety work.

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
