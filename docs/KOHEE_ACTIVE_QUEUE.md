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
- ChatGPT-first task intake is the default owner interface: the owner gives natural-language commands to ChatGPT, ChatGPT normalizes them into structured tasks, and the queue/control board record the normalized task and evidence.
- The control board is primarily for status, history, evidence, and approval visibility; raw manual task entry is secondary and must use the same task schema.
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
- Apex-grade cleanup means predictable contracts, reproducible evidence, measurable flow, explicit recovery playbooks, low-noise checks, reconciled state, and no hidden/manual state that only lives in chat.

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

### 3. ChatGPT-first task intake and task queue schema design

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define how owner natural-language commands to ChatGPT become structured automation tasks for the queue, Local Codex, GitHub evidence, and the future control board.
Commercial cleanup acceptance:
- Define task fields such as project, title, requested_by, priority, state, risk, lane, description, constraints, approval_required, target_repo, expected_outputs, and evidence_links.
- Clarify that ChatGPT is the primary task intake/normalization layer; direct control-board task entry is optional and must produce the same schema.
- Clarify that the control board is first a read-only status/history/approval visibility surface, not the main raw-input interface.
- Define how ambiguous commands are normalized, scoped, or turned into HOLD/clarification tasks without letting Codex improvise outside policy.
- No UI or write-action implementation yet.

### 4. Automation state machine and transition policy

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define allowed state transitions for automation tasks so Codex, Worker, ChatGPT, and the future control board agree on what can move from QUEUED to WORKING, PR_OPEN, CHECKS_FAILED, FIX_REQUIRED, HOLD_OWNER_APPROVAL, MERGE_READY, MERGED, DONE, or ABORTED.
Commercial cleanup acceptance:
- Document invalid transitions and required evidence for each transition.
- Make HIGH/HOLD transitions require owner approval before implementation resumes.
- Keep this as documentation first.

### 5. Automation reconciliation / drift audit

Risk: LOW audit/design
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design how the platform detects drift between declared state and actual GitHub state.
Commercial cleanup acceptance:
- Compare ACTIVE_QUEUE, issue #23, PR bodies, open/merged PRs, checks, review threads, and worker reports.
- Detect stale head SHAs, merged PRs still listed as active, unresolved review threads shown as ready, and WORKING tasks with no visible activity.
- Keep this as audit/design first.

### 6. Project registry manifest design

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design the managed-project registry that tells the platform which repos/projects exist, where their contract and queue live, and what risk profile they use.
Commercial cleanup acceptance:
- Include fields such as project id, repo, contract path, queue path, risk profile, owner, active flag, lifecycle, project type, system, deploy target, dependencies, docs link, and control-board visibility.
- Include KOHEE, news app, blog/status site, and internal handover app as example entries only.
- Do not create cross-repo dependencies yet.

### 7. Project catalog metadata design

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define catalog-style metadata for managed projects so the future control board can act as a lightweight developer portal.
Commercial cleanup acceptance:
- Include lifecycle values such as experimental, active, maintenance, and archived.
- Include ownership, docs, dependencies, deploy target, and risk profile links.
- Keep it compatible with the project registry rather than creating a competing source of truth.

### 8. Policy-as-code validator design

Risk: LOW docs/tooling design
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design validators for project contracts, queue items, status payloads, restricted operations, and PR evidence so policy violations fail in checks instead of relying on prose.
Commercial cleanup acceptance:
- List which policies become machine-checkable first.
- Keep KOHEE-specific checks separate from shared automation checks.
- Do not change existing validators in this step unless explicitly scoped.

### 9. Provenance and attestation readiness audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / SUPPLY_CHAIN
Scope: audit how PR evidence, check evidence, build/deploy summaries, and future artifact attestations should connect across the automation platform and managed projects.
Commercial cleanup acceptance:
- Identify which artifacts need provenance first.
- Keep it audit-only; no workflow or release changes yet.

### 10. OpenSSF Scorecard baseline audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / SUPPLY_CHAIN
Scope: evaluate whether Scorecard-style checks are useful as a baseline for the automation platform repo and managed project repos.
Commercial cleanup acceptance:
- Produce a baseline recommendation only.
- Do not add required checks yet.

### 11. Dependency automation policy

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / SUPPLY_CHAIN
Scope: define whether Dependabot, Renovate, or a minimal GitHub-native dependency update path should manage dependency update PRs across platform and managed projects.
Commercial cleanup acceptance:
- Define update schedule, max open dependency PRs, security update priority, lockfile-only rules, major-update HOLD behavior, and LOW auto-merge conditions.
- Keep it policy/design first; do not add updater workflows yet.

### 12. GitHub Actions runner/runtime posture audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: review workflow runtime posture across automation and managed projects.
Commercial cleanup acceptance:
- Inspect third-party action usage, action version pinning policy, token permission defaults, network/egress visibility options, and whether an audit-mode runner hardening tool is useful.
- Keep it audit-only; do not add new required checks yet.

### 13. Automation telemetry event schema

Risk: LOW docs/schema draft
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define the event schema for automation telemetry such as task_started, task_stopped, pr_opened, checks_failed, review_blocked, hold_required, merge_ready, worker_error, and queue_stale.
Commercial cleanup acceptance:
- Use stable event names and fields that the future control board can consume.
- Do not implement telemetry export yet.

### 14. Automation metrics / DORA-lite design

Risk: LOW docs/metrics
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define lightweight metrics for automation health and delivery flow.
Commercial cleanup acceptance:
- Include PR creation time, check failure rate, FIX_REQUIRED rate, HOLD rate, merge lead time, stop frequency, and recovery time.
- Keep it measurement design only.

### 15. Automation ADR policy

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define an architecture decision record policy for major platform choices.
Commercial cleanup acceptance:
- Cover repo split, Local Codex as executor, GitHub as source of truth, native GitHub auto-merge, direct merge bot rejection, read-only control board first, and automation freeze design.
- Keep decisions short, dated, and linked from source-of-truth docs.

### 16. Approval ledger design

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design how owner approvals for HIGH/HOLD work are recorded with scope, expiry, evidence, and project/task id.
Commercial cleanup acceptance:
- Approval records must be visible in GitHub-controlled evidence, not only in chat.
- Do not add approval buttons or write actions yet.

### 17. Owner override protocol

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define how the owner can override task priority or defer the automation lane without weakening safety gates.
Commercial cleanup acceptance:
- Overrides must include scope, reason, expiry, and evidence link.
- Overrides cannot bypass HIGH/HOLD approval or restricted operation rules.
- Keep this as documentation first.

### 18. Credential and permission inventory

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: document the names, purpose, owner, storage location, and rotation expectation for GitHub App permissions, Actions token permissions, Cloudflare Worker configuration, Wrangler access, and local Codex credentials. Never include secret values.
Commercial cleanup acceptance:
- Record metadata only, not sensitive values.
- Include per-project permission boundary notes for automation-platform, KOHEE, news app, blog/status site, and internal handover app.
- Keep least-privilege review separate from production changes.

### 19. Per-project permission boundary

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: define which automation components may read or coordinate with each managed project.
Commercial cleanup acceptance:
- Separate automation-platform repo access from managed project repo access.
- Document project-level access boundaries for KOHEE, news app, blog/status site, and internal handover app.
- Do not change actual permissions yet.

### 20. Automation freeze mode design

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: design a platform-wide freeze mode for pausing new Local Codex tasks, automatic merge eligibility, and coordination actions during incidents or owner-requested maintenance.
Commercial cleanup acceptance:
- Define who can set/unset freeze, where it is recorded, and what actions remain read-only.
- Documentation only.

### 21. Automation state snapshot / replay design

Risk: LOW docs/design
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: design how to capture and replay an automation state snapshot for debugging.
Commercial cleanup acceptance:
- Snapshot should include queue, open PRs, checks, review threads, issue #23 status, worker decisions, and Codex stop reports.
- Define how a future control board can show historical snapshots.
- No implementation yet.

### 22. Automation backlog separation

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: separate automation-platform backlog from KOHEE product backlog so Codex does not interleave platform foundation work with admin console, CSV, or future app implementation.
Commercial cleanup acceptance:
- Keep ACTIVE_QUEUE short and current.
- Move durable platform backlog items to a stable automation backlog doc if useful.
- Keep KOHEE product backlog below the automation lane.

### 23. Repo split preparation for `dev-automation-platform`

Risk: LOW docs/planning
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare a safe repo-split plan for a future `dev-automation-platform` repository. No code move yet.
Commercial cleanup acceptance:
- Define the target repo purpose, initial README, docs, schemas, templates, and example managed-project layout.
- List what stays in `kohee-list` versus what can later move to the platform repo.
- State that KOHEE remains the first managed project and must keep KOHEE-specific product rules in its own repo.
- Do not create cross-repo dependencies until schemas/templates are stable.

### 24. Shared template seed plan

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare the seed contents for reusable project templates before creating or populating the new repo.
Commercial cleanup acceptance:
- Include templates for AGENTS, ACTIVE_QUEUE, LOCAL_CODEX_RUNBOOK, project contract, risk/lane policy, and status reporting.
- Keep templates generic and parameterized so KOHEE-specific public `/data`, CSV, D1, and cafe policy do not leak into future projects.

### 25. Project onboarding checklist

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define the checklist for adding a new project under the automation platform.
Commercial cleanup acceptance:
- Include project contract, risk/lane map, restricted paths/operations, required checks, queue location, owner approval policy, deploy policy, and control-board registration.
- Include examples for KOHEE, news app, blog/status site, and internal handover app.
- Do not start product implementation from this checklist task.

### 26. Automation budget and retry guard

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: define limits for GitHub Actions reruns, Worker log volume, Codex night-run PR count, max parallel work, and repeated failure handling.
Commercial cleanup acceptance:
- Include rules such as max parallel 2, max retry 1 before HOLD, stale queue detection, and budget/usage review points.
- Keep it policy-only first.

### 27. Automation incident and recovery playbook

Risk: LOW docs/governance
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: document what to do if automation misclassifies work, queues the wrong task, creates conflicting PRs, or produces stale evidence.
Commercial cleanup acceptance:
- Include pause-local-worker guidance, stop-condition checks, PR cleanup guidance, queue correction flow, and evidence collection steps.
- Keep it documentation-only first.

### 28. Control board data-source mapping

Risk: LOW design-first
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define what the future read-only control board reads from GitHub, issue #23, ACTIVE_QUEUE, Actions checks, review threads, Worker dry-run logs, and Local Codex reports.
Commercial cleanup acceptance:
- Map each board field to a source of truth.
- Include current task, in-progress jobs, open PRs, checks, blockers, stop reason, risk, lane, and evidence links.
- No UI implementation yet.

### 29. Control board MVP design

Risk: LOW design-first
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: define the first read-only control board screen and API/data needs.
Commercial cleanup acceptance:
- Include queue, project registry, PR status, checks, blockers, stop reasons, risk/lane badges, and evidence links.
- Exclude approval, merge, branch, issue, and deployment actions from MVP.

### 30. Phase 5A local Codex worker runbook hardening

Risk: LOW/MEDIUM docs/tooling
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: harden local worker runbook, local prerequisites, worktree rules, task-pick rules, stop conditions, owner approval handoff, and kill-switch expectations. No daemon or unattended loop yet.

### 31. Phase 5B local task picker dry-run

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: add a local dry-run task picker that reads GitHub state and prints the next eligible LOW/MEDIUM task without executing changes. No background loop yet.

### 32. Approval notification bridge design

Risk: LOW audit/design
Track: `LOCAL_TRACK`
Lane: AUTOMATION_CONNECTIVITY / GOVERNANCE
Scope: design how HIGH/HOLD/FIX_REQUIRED status reaches the owner without manual polling. Start with GitHub mention/notification behavior; compare later PWA/Web Push only as a future option.

### 33. Phase 4C native auto-merge owner approval pack

Risk: HIGH until explicitly approved
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / DEPLOY_SAFETY
Scope: prepare an approval checklist for enabling native GitHub auto-merge on eligible LOW PRs only. Do not enable it without explicit owner approval.

### 34. Phase 5C local controlled worker loop owner approval pack

Risk: HIGH until explicitly approved
Track: `LOCAL_TRACK`
Lane: LOCAL_WORKER / GOVERNANCE
Scope: prepare the controlled local worker loop approval checklist and safety gates. Do not enable unattended execution without explicit owner approval.

### 35. Phase 6A reusable automation audit

Risk: LOW audit-only
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: classify reusable vs project-specific automation components. No extraction yet.

### 36. Phase 6B project automation prep templates

Risk: LOW docs/templates
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: prepare reusable AGENTS/ACTIVE_QUEUE/RUNBOOK/contract template guidance for KOHEE follow-up projects before feature work resumes.

### 37. Platform maturity gate review

Risk: LOW audit/review
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: review whether the automation platform is ready to manage project implementation work again.
Commercial cleanup acceptance:
- Require boundary, schema, ChatGPT-first intake schema, state machine, reconciliation plan, project registry, catalog metadata, policy-as-code design, provenance audit, security baseline audit, telemetry schema, metrics design, approval ledger, permission inventory, freeze mode, snapshot/replay design, backlog split, repo split plan, template seed, onboarding checklist, budget guard, incident playbook, control-board data mapping, and MVP board design to exist.
- Explicitly list what remains HOLD before project feature work resumes.

## Project work after automation lane

### 38. KOHEE admin review console Phase 2/3

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: FRONTEND_RENDERING
Scope: compact review console UX only; no API behavior change.

### 39. KOHEE submissions review CSV Phase 2

Risk: HIGH until scoped
Track: `LOCAL_TRACK`
Lane: CSV_PIPELINE
Scope: audit/design first; no reviewed CSV apply until explicitly approved.

### 40. Future project prep

Risk: LOW/MEDIUM depending on project
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope: after the automation lane, prepare per-project automation plans for news app, blog/status site, and internal handover app before product implementation.

## HOLD / do not start without approval

- Phase 3B actual GitHub write enablement
- Phase 4C native GitHub auto-merge enablement
- Phase 5C local controlled worker loop
- Automation control board write/approval actions
- Cross-repo automation code migration before boundary/schema/template docs are stable
- New project onboarding before project contract and risk policy exist
- Changes involving sensitive credential values
- D1/schema manager role cleanup
- manager_pick DB column cleanup
- resetCsv transaction/staging redesign
- auth/session/security redesign
- public `/data` behavior changes
- CSV import/reset semantics
- production deploy workflows/configuration
- GitHub App production coordination enablement
- automatic branch deletion
- automatic issue close
- direct merge bot fallback
- merge queue adoption

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
