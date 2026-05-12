# KOHEE Active Queue

Last updated: 2026-05-12
Purpose: current blockers and next actions only.

## Read first

- `AGENTS.md`
- this file
- current PR / issue / check logs
- `docs/LOCAL_CODEX_RUNBOOK.md` for `LOCAL_TRACK`
- `docs/KOHEE_MASTER_CONTEXT.md` only when policy or risk is unclear

## Direction

- GitHub is the source of truth: PRs, checks, review threads, issue #23, and logs.
- Urgent product bugs override automation.
- If there is no urgent product bug, automation implementation is the top priority.
- Local Codex should use one git worktree per active independent lane.
- Parallel work must not touch the same file, shared test, workflow, or risk area.
- Phase 3 comment/status bridge comes before Phase 4 native auto-merge.
- GitHub Actions/rulesets remain the final gate.

## Recently completed

- PR #141 maintenance audit stable invariants: merged, checks passed.
- PR #136 read-only maintenance audit: merged, checks passed.
- PR #134 command validator: merged, checks passed.
- PR #132 command dispatch create-only/no-overwrite: merged, checks passed.
- PR #128 commercial codebase gap audit: merged, checks passed.
- PR #129 public smoke retired manager_pick guard: merged, checks passed.
- PR #130 smoke command safety runbook: merged, checks passed.
- PR #118 legacy manager / manager_pick removal: merged, checks passed.
- Phase 2 webhook delivery: verified dry-run delivery from GitHub App to Worker.

## Current blockers

### Remote merged branch cleanup

Status: `HOLD_USER_APPROVAL`
Track: `LOCAL_TRACK`
Meaning: old merged remote branches can be cleaned later if the owner approves.
Decision: repository hygiene only; do not let this block Phase 3 implementation.

## Next work

### 1. Phase 3A safe issue-comment bridge dry-run parser and tests

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: implement only the dry-run parser/status classifier from `docs/PHASE3_SAFE_ISSUE_COMMENT_BRIDGE.md`; parse canonical `KOHEE_STATUS`, classify `OBSERVE` / `RECORD_STATUS_DRY_RUN` / `HOLD` / `REJECT`, and add Worker fixture tests.
Hard stop: no production write behavior or product-data behavior changes.
Parallel: do not run in parallel with other `automation/github-app-worker/**` work.

### 2. Phase 3A queue/report docs follow-up

Risk: LOW
Track: `LOCAL_TRACK`
Lane: GOVERNANCE
Scope: after Phase 3A parser PR merges, update ACTIVE_QUEUE, LOCAL_CODEX_AUDIT_LOG, and operator reporting examples.

### 3. Phase 4A native auto-merge readiness audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: inspect GitHub repo settings/checks/ruleset assumptions from evidence and report readiness only. Do not enable auto-merge.

### 4. Cloudflare Worker observability audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: AUTOMATION_CONNECTIVITY / DEPLOY_SAFETY
Scope: inspect dry-run Worker logging/observability settings and recommend whether to add Cloudflare Workers Logs config. Do not deploy.

### 5. GitHub dependency review audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: DEPLOY_SAFETY / SUPPLY_CHAIN
Scope: inspect whether dependency-review-action is useful for KOHEE PRs. Propose workflow changes only if low-noise and compatible with current rulesets.

### 6. Phase 5A local Codex worker runbook hardening

Risk: LOW/MEDIUM docs/tooling
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: harden local worker runbook and stop/kill-switch/worktree rules. No daemon or unattended loop yet.

### 7. Phase 6A reusable automation audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: classify reusable vs project-specific automation components. No extraction yet.

### 8. Admin review console Phase 2/3

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: FRONTEND_RENDERING
Scope: compact review console UX only; no API behavior change.

### 9. Submissions review CSV Phase 2

Risk: HIGH until scoped
Track: `LOCAL_TRACK`
Lane: CSV_PIPELINE
Scope: audit/design first; no reviewed CSV apply until explicitly approved.

## HOLD / do not start without approval

- Phase 3B actual GitHub write enablement
- Phase 4C native auto-merge enablement
- Phase 5C local controlled worker loop
- D1/schema manager role cleanup
- manager_pick DB column cleanup
- resetCsv transaction/staging redesign
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
