# KOHEE Active Queue

Last updated: 2026-05-13
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
- The target is an automation platform: finish the shared automation/control layer first, then let that layer manage KOHEE, news app, blog/status site, internal handover app, and future projects.
- Before continuing deeper automation, explicitly separate automation-platform rules from KOHEE-project rules so Local Codex and ChatGPT do not treat KOHEE product work as the automation platform itself.
- KOHEE is the first managed project and testbed, not the whole automation platform.
- Local Codex is the default executor for eligible LOW/MEDIUM implementation work.
- HIGH/HOLD work must stop for owner approval before implementation.
- ChatGPT acts as planner/reviewer/queue maintainer and MERGE/FIX/HOLD/NEXT judge.
- GitHub remains the shared command board and evidence ledger for all projects.
- Cloudflare/GitHub App Worker handles webhook/status bridge and later approved coordination, not unrestricted execution.
- Local Codex should use one git worktree per active independent lane.
- Parallel work must not touch the same file, shared test, workflow, or risk area.
- Phase 3 comment/status bridge comes before Phase 4 native GitHub auto-merge.
- GitHub Actions/rulesets remain the final gate.
- Product/project feature work stays below automation until the automation completion lane is finished or explicitly deferred by the owner.
- A status/control board is required after the automation layer is independent enough to feed it. The board must show current task list, active PRs, why Codex stopped, automation health, HIGH/MEDIUM/LOW risk, HOLD/FIX_REQUIRED items, and direct evidence links.

## Recently completed

- GitHub dependency review audit: completed as LOW audit-only docs; recommendation is an optional, path-filtered, read-only dependency-review workflow in a separate LOW PR if accepted.
- Cloudflare Worker observability audit: completed as LOW audit-only docs; recommendation is a separate LOW config-only PR to add Workers Logs config, with no deploy in the audit.
- PR #155 Phase 4B classifier review fix from PR #153: merged, PR checks passed, and the PR #153 P1/P2 review threads were resolved with #155 evidence.
- Phase 4B native auto-merge dry-run classifier: merged in PR #153; follow-up review fix completed in PR #155. Native auto-merge enablement remains HOLD.
- PR #151 Phase 3A parser review fix from PR #146: merged, PR checks passed, main Validate/Deploy passed; Deploy skipped Pages/Worker deploy and smoke steps.
- PR #150 task-list correction for Phase 3A parser review fix: merged, PR checks passed, main Validate/Deploy passed; Deploy skipped Pages/Worker deploy and smoke steps.
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
Decision: repository hygiene only; do not let this block automation implementation.

## Next work: automation completion lane

### 1. Automation platform / KOHEE project boundary definition

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define the automation platform boundary before deeper Phase 5/6 work. Separate shared automation contracts, queue schema, status schema, worker rules, and Local Codex execution rules from KOHEE-specific product rules such as public `/data`, CSV lifecycle, cafe/admin UI, and D1 policy. No extraction or runtime change yet.

### 2. Phase 5A local Codex worker runbook hardening

Risk: LOW/MEDIUM docs/tooling
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: harden local worker runbook, local prerequisites, worktree rules, task-pick rules, stop conditions, owner approval handoff, and kill-switch expectations. No daemon or unattended loop yet.

### 3. Phase 5B local task picker dry-run

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: add a local dry-run task picker that reads GitHub state and prints the next eligible LOW/MEDIUM task without executing changes. No background loop yet.

### 4. Approval notification bridge design

Risk: LOW audit/design
Track: `LOCAL_TRACK`
Lane: AUTOMATION_CONNECTIVITY / GOVERNANCE
Scope: design how HIGH/HOLD/FIX_REQUIRED status reaches the owner without manual polling. Start with GitHub mention/notification behavior; compare later PWA/Web Push only as a future option.

### 5. Phase 4C native auto-merge owner approval pack

Risk: HIGH until explicitly approved
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: prepare an approval checklist for enabling native GitHub auto-merge on eligible LOW PRs only. Do not enable it without explicit owner approval.

### 6. Phase 5C local controlled worker loop owner approval pack

Risk: HIGH until explicitly approved
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: prepare the controlled local worker loop approval checklist and safety gates. Do not enable unattended execution without explicit owner approval.

### 7. Phase 6A reusable automation audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: classify reusable vs project-specific automation components. No extraction yet.

### 8. Phase 6B project automation prep templates

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare reusable AGENTS/ACTIVE_QUEUE/RUNBOOK/contract template guidance for KOHEE follow-up projects before feature work resumes.

### 9. Automation control board design

Risk: LOW design-first
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design the task/status board after the automation layer can feed it. The board should show current queue, in-progress local worker jobs, open PRs, check status, review-thread blockers, Codex stop reason, HIGH/MEDIUM/LOW risk, HOLD/FIX_REQUIRED items, and links back to GitHub evidence. Start as read-only; no direct approvals or writes until separately approved.

## Project work after automation lane

### 10. KOHEE admin review console Phase 2/3

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: FRONTEND_RENDERING
Scope: compact review console UX only; no API behavior change.

### 11. KOHEE submissions review CSV Phase 2

Risk: HIGH until scoped
Track: `LOCAL_TRACK`
Lane: CSV_PIPELINE
Scope: audit/design first; no reviewed CSV apply until explicitly approved.

### 12. Future project prep

Risk: LOW/MEDIUM depending on project
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: after the automation lane, prepare per-project automation plans for news app, blog/status site, and internal handover app before product implementation.

## HOLD / do not start without approval

- Phase 3B actual GitHub write enablement
- Phase 4C native auto-merge enablement
- Phase 5C local controlled worker loop
- Automation control board write/approval actions
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
