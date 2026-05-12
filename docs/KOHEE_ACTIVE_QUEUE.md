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

- PR #148 Phase 4A native auto-merge readiness audit: merged, PR checks passed, main Validate/Deploy passed; Deploy skipped Pages/Worker deploy and smoke steps.
- PR #146 Phase 3A dry-run KOHEE_STATUS parser: merged, PR checks passed, main Validate/Deploy passed; Deploy skipped Pages/Worker deploy and smoke steps.
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
Decision: repository hygiene only; do not let this block Phase 3/4 automation implementation.

## Next work

### 1. Phase 3A parser review fix from PR #146

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: fix the unresolved PR #146 review finding before continuing Phase 4B. Unsupported issue numbers must stay rejected even when a malformed `KOHEE_STATUS` comment also matches older Codex status markers. Add regression tests for the unsupported-issue fallback case.
Files likely: `automation/github-app-worker/src/policy.mjs`, `automation/github-app-worker/test/dry-run.test.mjs`.
Hard stop: no GitHub write enablement, issue close, branch delete, auto-merge enablement, deploy, D1/schema, auth/session, CSV, or public `/data` changes.

### 2. Phase 4B native auto-merge dry-run classifier tests

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: add dry-run classifier tests only for LOW native auto-merge eligibility. Do not enable auto-merge, direct merge, issue close, branch delete, deploy, secrets, D1/schema, auth/session, CSV, or public `/data` changes.

### 3. Cloudflare Worker observability audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: AUTOMATION_CONNECTIVITY / DEPLOY_SAFETY
Scope: inspect dry-run Worker logging/observability settings and recommend whether to add Cloudflare Workers Logs config. Do not deploy.

### 4. GitHub dependency review audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: DEPLOY_SAFETY / SUPPLY_CHAIN
Scope: inspect whether dependency-review-action is useful for KOHEE PRs. Propose workflow changes only if low-noise and compatible with current rulesets.

### 5. Phase 5A local Codex worker runbook hardening

Risk: LOW/MEDIUM docs/tooling
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: harden local worker runbook and stop/kill-switch/worktree rules. No daemon or unattended loop yet.

### 6. Phase 6A reusable automation audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: classify reusable vs project-specific automation components. No extraction yet.

### 7. Admin review console Phase 2/3

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: FRONTEND_RENDERING
Scope: compact review console UX only; no API behavior change.

### 8. Submissions review CSV Phase 2

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
