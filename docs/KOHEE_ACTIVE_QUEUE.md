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
- Keep the automation platform organized like a commercial codebase: small modules, explicit contracts, stable schemas, clear ownership boundaries, narrow PRs, low-noise checks, and minimal duplicated policy text.
- Separate the automation platform into its own repository only after the boundary/schema/backlog/template steps are documented. Do not move working runtime automation code blindly.
- Preferred future repo name: `dev-automation-platform`, unless the owner chooses another name.
- Treat the platform as a control plane: every managed project must declare a contract, status schema, queue, checks, restricted operations, and owner-approval path before automation manages it.
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
- Enterprise-grade cleanup means predictable contracts, reproducible evidence, explicit recovery playbooks, low-noise checks, and no hidden/manual state that only lives in chat.

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
Commercial cleanup acceptance:
- Produce a concise boundary document or section that separates shared automation core from KOHEE project policy.
- Identify the future folder/doc shape for shared automation contracts, project contracts, worker/runbook docs, and per-project queues.
- Avoid broad refactors or file moves in this step.
- Keep duplicated policy text low and point to source-of-truth docs where possible.

### 2. Automation status schema draft

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: draft the common automation status schema needed by queue, issue #23, PR bodies, Local Codex reports, Worker decisions, and the future control board. This should be a design/schema draft first; no board implementation yet.
Commercial cleanup acceptance:
- Define fields such as project, task_id, state, risk, lane, owner, current_pr, blocker, stop_reason, next_action, and evidence_links.
- Keep it reusable across KOHEE, news app, blog/status site, and internal handover app.
- Do not force every existing doc to migrate in this step.

### 3. Automation state machine and transition policy

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define allowed state transitions for automation tasks so Codex, Worker, ChatGPT, and the future control board agree on what can move from QUEUED to WORKING, PR_OPEN, CHECKS_FAILED, FIX_REQUIRED, HOLD_OWNER_APPROVAL, MERGE_READY, MERGED, DONE, or ABORTED.
Commercial cleanup acceptance:
- Document invalid transitions and required evidence for each transition.
- Make HIGH/HOLD transitions require owner approval before implementation resumes.
- Keep this as documentation first.

### 4. Automation backlog separation

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: separate automation-platform backlog from KOHEE product backlog so Codex does not interleave platform foundation work with admin console, CSV, or future app implementation.
Commercial cleanup acceptance:
- Keep ACTIVE_QUEUE short and current.
- Move durable platform backlog items to a stable automation backlog doc if useful.
- Keep KOHEE product backlog below the automation lane.

### 5. Repo split preparation for `dev-automation-platform`

Risk: LOW docs/planning
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare a safe repo-split plan for a future `dev-automation-platform` repository. No code move yet.
Commercial cleanup acceptance:
- Define the target repo purpose, initial README, docs, schemas, templates, and example managed-project layout.
- List what stays in `kohee-list` versus what can later move to the platform repo.
- State that KOHEE remains the first managed project and must keep KOHEE-specific product rules in its own repo.
- Do not create cross-repo dependencies until schemas/templates are stable.

### 6. Shared template seed plan

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare the seed contents for reusable project templates before creating or populating the new repo.
Commercial cleanup acceptance:
- Include templates for AGENTS, ACTIVE_QUEUE, LOCAL_CODEX_RUNBOOK, project contract, risk/lane policy, and status reporting.
- Keep templates generic and parameterized so KOHEE-specific public `/data`, CSV, D1, and cafe policy do not leak into future projects.

### 7. Project onboarding checklist

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define the checklist for adding a new project under the automation platform.
Commercial cleanup acceptance:
- Include project contract, risk/lane map, restricted paths/operations, required checks, queue location, owner approval policy, deploy policy, and control-board registration.
- Include examples for KOHEE, news app, blog/status site, and internal handover app.
- Do not start product implementation from this checklist task.

### 8. Automation budget and retry guard

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: define limits for GitHub Actions reruns, Worker log volume, Codex night-run PR count, max parallel work, and repeated failure handling.
Commercial cleanup acceptance:
- Include rules such as max parallel 2, max retry 1 before HOLD, stale queue detection, and budget/usage review points.
- Keep it policy-only first.

### 9. Automation incident and recovery playbook

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: document what to do if automation misclassifies work, queues the wrong task, creates conflicting PRs, or produces stale evidence.
Commercial cleanup acceptance:
- Include pause-local-worker guidance, stop-condition checks, PR cleanup guidance, queue correction flow, and evidence collection steps.
- Keep it documentation-only first.

### 10. Control board data-source mapping

Risk: LOW design-first
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define what the future read-only control board reads from GitHub, issue #23, ACTIVE_QUEUE, Actions checks, review threads, Worker dry-run logs, and Local Codex reports.
Commercial cleanup acceptance:
- Map each board field to a source of truth.
- Include current task, in-progress jobs, open PRs, checks, blockers, stop reason, risk, lane, and evidence links.
- No UI implementation yet.

### 11. Phase 5A local Codex worker runbook hardening

Risk: LOW/MEDIUM docs/tooling
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: harden local worker runbook, local prerequisites, worktree rules, task-pick rules, stop conditions, owner approval handoff, and kill-switch expectations. No daemon or unattended loop yet.

### 12. Phase 5B local task picker dry-run

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: add a local dry-run task picker that reads GitHub state and prints the next eligible LOW/MEDIUM task without executing changes. No background loop yet.

### 13. Approval notification bridge design

Risk: LOW audit/design
Track: `LOCAL_TRACK`
Lane: AUTOMATION_CONNECTIVITY / GOVERNANCE
Scope: design how HIGH/HOLD/FIX_REQUIRED status reaches the owner without manual polling. Start with GitHub mention/notification behavior; compare later PWA/Web Push only as a future option.

### 14. Phase 4C native auto-merge owner approval pack

Risk: HIGH until explicitly approved
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: prepare an approval checklist for enabling native GitHub auto-merge on eligible LOW PRs only. Do not enable it without explicit owner approval.

### 15. Phase 5C local controlled worker loop owner approval pack

Risk: HIGH until explicitly approved
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: prepare the controlled local worker loop approval checklist and safety gates. Do not enable unattended execution without explicit owner approval.

### 16. Phase 6A reusable automation audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: classify reusable vs project-specific automation components. No extraction yet.

### 17. Phase 6B project automation prep templates

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare reusable AGENTS/ACTIVE_QUEUE/RUNBOOK/contract template guidance for KOHEE follow-up projects before feature work resumes.

### 18. Automation control board design

Risk: LOW design-first
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design the task/status board after the automation layer can feed it. The board should show current queue, in-progress local worker jobs, open PRs, check status, review-thread blockers, Codex stop reason, HIGH/MEDIUM/LOW risk, HOLD/FIX_REQUIRED items, and links back to GitHub evidence. Start as read-only; no direct approvals or writes until separately approved.

### 19. Platform maturity gate review

Risk: LOW audit/review
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: review whether the automation platform is ready to manage project implementation work again.
Commercial cleanup acceptance:
- Require boundary, schema, backlog split, repo split plan, template seed, onboarding checklist, incident playbook, and control-board data mapping to exist.
- Explicitly list what remains HOLD before project feature work resumes.

## Project work after automation lane

### 20. KOHEE admin review console Phase 2/3

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: FRONTEND_RENDERING
Scope: compact review console UX only; no API behavior change.

### 21. KOHEE submissions review CSV Phase 2

Risk: HIGH until scoped
Track: `LOCAL_TRACK`
Lane: CSV_PIPELINE
Scope: audit/design first; no reviewed CSV apply until explicitly approved.

### 22. Future project prep

Risk: LOW/MEDIUM depending on project
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: after the automation lane, prepare per-project automation plans for news app, blog/status site, and internal handover app before product implementation.

## HOLD / do not start without approval

- Phase 3B actual GitHub write enablement
- Phase 4C native auto-merge enablement
- Phase 5C local controlled worker loop
- Automation control board write/approval actions
- Cross-repo automation code migration before boundary/schema/template docs are stable
- New project onboarding before project contract and risk policy exist
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
