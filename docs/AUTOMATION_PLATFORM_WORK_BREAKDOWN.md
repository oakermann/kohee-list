# Automation Platform Work Breakdown

Date: 2026-05-13
Status: planning / queue organization
Risk: LOW docs/governance

This document explains the work categories and ordering behind the active automation execution queue.

Source of truth:
- Active lane/router: `docs/QUEUE_ROUTER.md`
- Active execution queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Paused product queue: `docs/queues/KOHEE_PRODUCT.md`

Compatibility note:
- Older references to `Phase 4` now map to the current `Phase 5 bridge` section in this document.

No runtime behavior, repo settings, workflow settings, deployment, credential, D1/schema, auth/session, CSV, or public `/data` behavior is changed by this document.

## 0. Ordering principle

The current active path is:

1. Phase 5 bridge: make Local Codex execution, task picking, approvals, and evidence-based decisions reliable.
2. Phase 6A separation foundation: separate automation-platform rules from KOHEE-product rules.
3. Phase 6B hardening: harden the separated platform with supply-chain, CI/CD, recovery, rollback, observability, and control-board planning.
4. Phase 6C maturity gate: decide whether product work can resume under the platform.

Reason:
- Phase 5 bridge is needed now because Local Codex must safely continue from the current repo state.
- Phase 6A still establishes the platform/product boundary before broad hardening turns into implementation work.
- Phase 6B hardening comes after the boundary exists.
- Phase 6C prevents KOHEE product work from resuming before the platform is ready.

## 1. Work categories

### A. Local Codex execution control

Purpose: make Local Codex the default executor for eligible work without letting it improvise.

Items:
- Local Codex worker contract and runbook hardening.
- Dry-run picker plan.
- Task-pick rules and stop conditions.
- Task lease and heartbeat design.
- Local controlled worker loop owner approval pack.
- Low/medium PR exercise loop using real PRs before stronger automation.

Output:
- Worktree/task-pick/stop rules.
- Dry-run task picker.
- Lease and heartbeat model.
- Controlled-loop approval pack.
- Proof plan for repeated safe Local Codex runs.

### B. Evidence-based decision system

Purpose: make ChatGPT/owner decisions depend on GitHub evidence, not Codex self-report.

Items:
- GitHub evidence validator.
- Evidence-first approval/report format.
- MERGE / FIX / HOLD / NEXT criteria.
- PR URL, head SHA, checks, changed files, review threads, issue state, blocker status.
- Evidence loop exercise using real low/medium PRs.

Output:
- Evidence report contract.
- Merge decision policy.
- Fix/Hold/Next decision policy.
- Maturity-gate evidence requirements.

### C. Platform boundary and ownership

Purpose: separate the automation platform from KOHEE product work.

Items:
- Automation platform / KOHEE project boundary definition.
- Automation backlog separation.
- Repo split preparation for `dev-automation-platform`.
- Shared template seed plan.
- Project onboarding checklist.
- Project golden path scaffolding design.
- Reusable automation core vs KOHEE-specific rules.

Output:
- Clear platform-vs-project boundary.
- KOHEE treated as the first managed project, not the platform itself.
- Future `dev-automation-platform` repo plan.
- Reusable templates and onboarding path.

### D. Contracts, schemas, and task normalization

Purpose: make work machine-readable and stable before automation executes it more strongly.

Items:
- Automation status schema draft.
- ChatGPT-first task intake and task queue schema design.
- Automation state machine and transition policy.
- Project registry manifest design.
- Project catalog metadata design.

Output:
- Common status schema.
- Task schema for owner commands normalized by ChatGPT.
- State transition rules.
- Project registry/catalog model.

### E. Policy, governance, and safety gates

Purpose: make rules explicit and eventually checkable.

Items:
- LLM / automation input trust boundary design.
- Policy-as-code validator design.
- Approval ledger design.
- Owner override protocol.
- Protected environment approval gate design.
- Automation ADR policy.
- Platform maturity gate review.

Output:
- Checkable policy direction.
- Recorded approval model.
- Owner override rules.
- Major decisions recorded as ADRs.
- A gate before product work resumes.

### F. Worker and event intake robustness

Purpose: make GitHub App Worker / webhook status flow reliable before stronger automation.

Items:
- Webhook idempotency and redelivery design.
- Reusable workflow baseline design.
- Native auto-merge owner approval pack.

Output:
- Duplicate/redelivery-safe webhook design.
- Shared workflow direction.
- Auto-merge remains HOLD until explicitly approved.

### G. Supply-chain and CI/CD posture

Purpose: make the platform safe enough to manage multiple repos over time.

Items:
- Workflow permission review.
- Action-pinning review plan.
- High-risk workflow-pattern audit plan.
- GitHub Actions runner/runtime posture audit.
- OIDC / short-lived credential readiness audit.
- Secret scanning and push protection baseline.
- Credential and permission inventory.
- Per-project permission boundary.
- Dependency-change gate.
- Dependency automation policy.
- Lifecycle/install-script policy.
- Lockfile/package-manager-change review.
- Token-rotation checklist.
- Supply-chain incident freeze mode.
- Provenance and attestation readiness audit.
- SLSA-lite feasibility.
- SBOM readiness roadmap.
- OpenSSF Scorecard or equivalent baseline review.

Output:
- Supply-chain evidence roadmap.
- Baseline CI/CD posture.
- Dependency update policy.
- Permission and credential boundaries.
- Incident freeze policy.

### H. Recovery and rollback auditability

Purpose: make failed automation recoverable and auditable.

Items:
- Rollback note requirement.
- Last-known-good SHA tracking design.
- Failed PR history.
- Blocked-lane history.
- Automation decision log.
- Automation incident and recovery playbook.

Output:
- Recovery and rollback auditability model.
- Concrete fields/locations for maturity-gate review.
- Incident playbook.

### I. Observability, reconciliation, and control board

Purpose: make the automation visible, auditable, and debuggable.

Items:
- Automation reconciliation / drift audit.
- Automation telemetry event schema.
- Automation event journal design.
- Automation metrics / DORA-lite design.
- Automation state snapshot / replay design.
- Control board data-source mapping.
- Control board MVP design.
- Project catalog health and orphan audit.
- Automation budget and retry guard.

Output:
- Drift detection plan.
- Event and metric schemas.
- Snapshot/replay plan.
- Control board data model and MVP.
- Retry and budget policy.

### J. Product work after automation lane

Purpose: keep product work visible but paused until the automation platform is ready.

Items:
- KOHEE admin review console Phase 2/3.
- KOHEE submissions review CSV Phase 2.
- Future project prep for news app, blog/status site, and internal handover app.

Output:
- Product work resumes under the automation platform instead of bypassing it.

Queue location:
- Product work lives in `docs/queues/KOHEE_PRODUCT.md`.
- Do not run it from this work-breakdown document.

## 2. Recommended execution order

### Phase 0: Merge / activate the queue split

Status: complete.

Goal:
- Make the split queue/router direction visible on `main`.

Rules:
- Use `docs/QUEUE_ROUTER.md` to find the active lane.
- Use `docs/queues/AUTOMATION_PLATFORM.md` as the active execution queue while the router says `AUTOMATION_PLATFORM`.
- Do not start product feature work while the automation lane is active.

### Phase 5 bridge: local execution and approval readiness

Goal:
- Bridge the current automation state into Phase 6 by making Local Codex task selection, approvals, and evidence-based decisions reliable.

Run in this order:
1. Local Codex worker contract/runbook hardening.
2. Task-pick rules and stop conditions.
3. Dry-run picker plan.
4. Evidence-based decision system draft.
5. Evidence-first owner approval/report format.
6. Low/medium PR exercise loop plan.
7. Approval notification bridge design.
8. Native auto-merge owner approval pack.
9. Local controlled worker loop owner approval pack.

Hard stops:
- No unattended loop.
- No auto-merge enablement.
- No product feature work.
- Stronger behavior remains HOLD until explicit owner approval.

Why now:
- Local Codex is the immediate executor, so task-pick and stop rules must be reliable before the platform boundary/hardening work continues.

### Phase 6A: separation foundation

Goal:
- Separate automation-platform rules from KOHEE product rules before broad hardening.

Run in this order:
1. Automation platform / KOHEE project boundary definition.
2. Automation status schema draft.
3. ChatGPT-first task intake and task queue schema design.
4. Automation state machine and transition policy.
5. Project registry manifest design.
6. Project catalog metadata design.
7. Automation backlog separation.
8. Repo split preparation for `dev-automation-platform`.
9. Shared template seed plan.
10. Project onboarding checklist.
11. Project golden path scaffolding design.

Hard stops:
- Do not create the new repo unless explicitly approved.
- Do not move runtime automation code unless explicitly approved.
- Do not start KOHEE product work.

Why here:
- The platform/product boundary must exist before broad hardening becomes implementation work.

#### Phase 6A separation foundation contract

Purpose:
- Treat KOHEE as the first managed project, not the automation platform itself.
- Define reusable automation rules without copying KOHEE product policies into future projects.
- Keep product queues paused until the platform maturity gate or explicit owner/ChatGPT deferral.

Boundary table:

| Area | Automation platform | KOHEE product |
| --- | --- | --- |
| Queue routing | Active lane, active queue, maturity gate, evidence rules | Product backlog and feature priorities |
| Execution control | Local worker contract, dry-run picker, evidence validator, approval packs | Product implementation work after maturity gate |
| Safety policy | Generic risk gates, forbidden areas, approvals, auditability | KOHEE-specific public data, cafe lifecycle, CSV, D1 rules |
| Templates | Reusable task intake, reports, project registry, onboarding | KOHEE-specific UI/API/admin workflows |
| Runtime | Future platform worker/control plane only after approval | Existing KOHEE app runtime |

Automation status schema draft:

| Status | Meaning |
| --- | --- |
| `BACKLOG` | Recorded but not active. |
| `READY` | Eligible for dry-run selection. |
| `PICKED` | Selected by dry-run picker or owner/ChatGPT. |
| `IN_PROGRESS` | Local Codex or ChatGPT is working on it. |
| `PR_OPEN` | PR exists and needs evidence validation. |
| `FIX_REQUIRED` | Scope is acceptable but checks/review/evidence require a fix. |
| `HOLD` | Owner/ChatGPT approval or clearer scope is required. |
| `MERGED` | PR merged with evidence. |
| `CLOSED` | Closed without merge, with reason. |
| `NEXT` | Completed or skipped with a clear follow-up. |

Task intake schema draft:

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Stable short task id. |
| `project` | yes | `automation-platform`, `kohee-product`, or future project id. |
| `lane` | yes | Active lane such as `AUTOMATION_PLATFORM`. |
| `source` | yes | Queue, issue, PR, or owner request. |
| `goal` | yes | One-sentence outcome. |
| `risk` | yes | LOW, MEDIUM, HIGH, or HOLD. |
| `allowed_files` | yes | Expected file paths or globs. |
| `forbidden_areas` | yes | Areas that must not change. |
| `checks` | yes | Required validation. |
| `evidence` | yes | PR/check/thread/issue fields required. |
| `next_action` | yes | Exact next step. |

State transition policy:

```text
BACKLOG -> READY -> PICKED -> IN_PROGRESS -> PR_OPEN -> MERGED -> NEXT
BACKLOG -> HOLD
READY -> HOLD
PICKED -> HOLD
IN_PROGRESS -> FIX_REQUIRED -> IN_PROGRESS
PR_OPEN -> FIX_REQUIRED -> PR_OPEN
PR_OPEN -> HOLD
PR_OPEN -> CLOSED
```

Transition rules:
- `MERGED` requires GitHub evidence and successful required checks.
- `FIX_REQUIRED` requires a concrete failed check, review, scope, wording, or evidence issue.
- `HOLD` requires owner/ChatGPT decision, clearer scope, or risk approval.
- `CLOSED` requires reason and follow-up.
- Product tasks cannot move to `READY` while `AUTOMATION_PLATFORM` is active unless the owner/ChatGPT explicitly defers the automation lane.

Project registry manifest draft:

```json
{
  "project_id": "kohee-list",
  "project_type": "managed_project",
  "active_queue": "docs/queues/KOHEE_PRODUCT.md",
  "status": "paused_until_platform_maturity_gate",
  "risk_profile": ["d1", "auth", "csv", "public_data", "deploy"],
  "owner_approval_required_for": ["high_risk", "deploy", "schema", "auth", "public_data"]
}
```

Project catalog metadata draft:

| Field | Meaning |
| --- | --- |
| `project_id` | Stable id for routing. |
| `repo` | GitHub repository. |
| `default_branch` | Default branch for evidence checks. |
| `active_queue` | Queue used when project lane is active. |
| `paused_reason` | Why project work is paused, if applicable. |
| `risk_profile` | Project-specific risk areas. |
| `validation_profile` | Required checks and smoke tests. |
| `resume_gate` | Condition to resume project work. |

Backlog separation rule:
- Platform backlog contains reusable automation engine, governance, evidence, policy, templates, and control-plane work.
- KOHEE product backlog contains cafe/admin/UI/API/CSV/D1/product work.
- Future project backlog must not inherit KOHEE product constraints unless explicitly mapped in that project's profile.

Repo split preparation:
- Future target repo name: `dev-automation-platform`.
- Current repo remains the source while the platform is immature.
- Do not create or move to the new repo without explicit owner approval.
- Before split, define exported docs, templates, task schema, project registry, and migration checklist.

Shared template seed plan:
- Task intake template.
- Evidence report template.
- MERGE/FIX/HOLD/NEXT decision template.
- Project registry entry template.
- Maturity gate template.
- Incident/freeze note template.

Project onboarding checklist:
1. Create project registry entry.
2. Identify project-specific risk areas.
3. Identify validation commands and smoke checks.
4. Define product queue path.
5. Define forbidden areas and approval requirements.
6. Confirm evidence fields for PR decisions.
7. Confirm resume/maturity gate.

Golden path scaffolding design:
1. Owner request enters ChatGPT.
2. ChatGPT normalizes to task intake schema.
3. Dry-run picker evaluates task eligibility.
4. Local Codex executes only approved/eligible task.
5. PR opens with evidence report.
6. Evidence validator returns MERGE/FIX/HOLD/NEXT.
7. Result is recorded in queue/issue/ledger.

### Phase 6B: harden the separated platform

Goal:
- Apply additional hardening after Phase 6A establishes the platform/product boundary.

Run in this order:
1. LLM / automation input trust boundary design.
2. Policy-as-code validator design.
3. Approval ledger design.
4. Owner override protocol.
5. Protected environment approval gate design.
6. Automation ADR policy.
7. Webhook idempotency and redelivery design.
8. Task lease and heartbeat design.
9. Reusable workflow baseline design.
10. Supply-chain and CI/CD posture bundle.
11. Recovery and rollback auditability bundle.
12. Observability / telemetry / event journal bundle.
13. Control board data-source mapping and MVP design.
14. Automation budget and retry guard.
15. Extra hardening grouped into scoped follow-up PRs.

Hard stops:
- Planning/design/audit first.
- No stronger write/merge/control-board actions without explicit owner approval.
- Do not change deployment credentials or production settings without explicit owner approval.
- Do not make noisy audit findings blocking until they are proven high-signal.
- Do not treat dependency/package changes as LOW by default.

Why here:
- These items should influence later implementation, but they should not delay the immediate Phase 5 bridge or the Phase 6A separation foundation.

#### Phase 6B lane split

Purpose:
- Keep Phase 6B parallelizable without overlapping files, checks, or risk areas.
- Prevent one oversized hardening PR.
- Let Local Codex run independent LOW/MEDIUM lanes only when the dry-run picker confirms no overlap.

Lane table:

| Lane | Scope | Primary output | Parallel notes |
| --- | --- | --- | --- |
| `6B-1 trust-policy-approval` | LLM/input trust boundary, policy-as-code validator, approval ledger, owner override, protected environment approval, ADR policy | Policy and approval hardening contract | Can run alone first; it defines policy language used by later lanes. |
| `6B-2 event-worker-lease` | Webhook idempotency, redelivery, task lease, heartbeat, reusable workflow baseline | Event intake and worker reliability contract | May run after or beside 6B-1 if it does not touch the same file sections. |
| `6B-3 supply-chain-ci` | Workflow permission review, action pinning, workflow-pattern audit, OIDC readiness, dependency/install safeguards, incident freeze mode | Supply-chain and CI/CD posture contract | Keep separate from package/lockfile changes; docs/audit only unless approved. |
| `6B-4 recovery-rollback` | Rollback note, last-known-good SHA, failed PR history, blocked-lane history, decision log, incident playbook | Recovery and rollback auditability contract | Can run in parallel with observability if file scopes do not overlap. |
| `6B-5 observability-control-board` | Reconciliation, telemetry, event journal, metrics, snapshot/replay, control-board mapping/MVP, project health audit | Observability and control-board contract | Design only; no runtime dashboard implementation without approval. |
| `6B-6 budget-retry-maturity-prep` | Automation budget, retry guard, maturity-gate readiness checklist, remaining HOLD list | Budget/retry and Phase 6C prep contract | Run last because it consumes outputs from earlier lanes. |

Lane rules:
- Each lane must produce a scoped docs/schema/design PR unless explicitly approved otherwise.
- Each lane must list expected files and forbidden areas before editing.
- Lanes must not change the same files in parallel unless owner/ChatGPT explicitly serializes merge order.
- `scripts/check-queue-docs.mjs` changes should be serialized because many lanes may need it.
- Runtime code, workflow settings, repo settings, deployment settings, credentials, D1/schema, auth/session, CSV import/reset, public `/data`, dependency/package/lockfile/install-script behavior, auto-merge, and unattended loops remain HOLD unless explicitly approved.
- If a lane needs a stronger action, it must produce an approval pack rather than enabling that action.

Recommended merge order:
1. `6B-1 trust-policy-approval`
2. `6B-2 event-worker-lease`
3. `6B-3 supply-chain-ci`
4. `6B-4 recovery-rollback`
5. `6B-5 observability-control-board`
6. `6B-6 budget-retry-maturity-prep`

Parallel eligibility:
- `6B-4 recovery-rollback` and `6B-5 observability-control-board` can be parallel candidates after `6B-1` lands if their file scopes do not overlap.
- `6B-3 supply-chain-ci` can run in parallel only as docs/audit work and only if it does not touch package/lockfile/workflow files.
- `6B-6` is not parallel by default; it depends on previous lane outputs.

### Phase 6C: maturity gate

Goal:
- Decide whether the automation platform is ready to manage project implementation work.

Gate must verify:
- Phase 5 bridge work is accounted for.
- Local execution readiness and evidence-based decision planning exist.
- The low/medium PR exercise loop has been run or is explicitly scheduled with a blocker.
- Phase 6A separation foundation exists.
- Phase 6B hardening docs exist or remaining items are explicitly scheduled.
- Dependency/install safeguards are present or explicitly scheduled.
- Recovery and rollback auditability is concrete enough to be used.
- Remaining HOLD items are explicit.
- Evidence-based MERGE / FIX / HOLD / NEXT flow is usable from GitHub evidence.
- Product work can resume only if owner/ChatGPT allows it under the platform.

Hard stops:
- Do not resume KOHEE product work unless the maturity gate passes or the owner/ChatGPT explicitly defers the automation lane.
- Do not pass the maturity gate on design-only claims if the evidence loop, recovery/auditability coverage, dependency/install safeguards, and HOLD list are not concrete.

### After Phase 6: project work or repo-independent generalization

If the maturity gate passes and owner/ChatGPT allows product work:
- Resume from `docs/queues/KOHEE_PRODUCT.md`.

If the owner/ChatGPT keeps `AUTOMATION_PLATFORM` active:
- Continue repo-independent platform generalization for news app, blog/status site, and internal handover app reuse.

## 3. Practical grouping for Local Codex

To avoid 40 tiny PRs, group work into small coherent PRs:

1. Local worker runbook + task-pick rules + dry-run picker.
2. Evidence-based decision system + approval/report format.
3. Boundary + status schema + task intake schema.
4. State machine + registry + catalog.
5. Backlog split + repo split prep + templates + onboarding/golden path.
6. Trust boundary + policy-as-code + approval/override/ADR.
7. Webhook idempotency + task lease + reusable workflow baseline.
8. Supply-chain and CI/CD posture bundle.
9. Recovery and rollback auditability bundle.
10. Telemetry/event/metrics/snapshot bundle.
11. Control board mapping + MVP design + maturity gate.

Each PR must stay docs/schema/design-only unless explicitly scoped otherwise.

## 4. Rule of thumb

Work nature decides grouping. Execution order decides priority.

- Category tells what kind of work it is.
- Phase tells when it should run.
- Phase 5 bridge comes first because Local Codex must safely continue current work.
- Phase 6A establishes separation before Phase 6B broad hardening is folded in.
- `docs/QUEUE_ROUTER.md` tells which queue is active.
- `docs/queues/AUTOMATION_PLATFORM.md` is the active automation execution queue while the router says `AUTOMATION_PLATFORM`.
- `docs/queues/KOHEE_PRODUCT.md` is paused product work.
- This document explains grouping and order; it is not the active queue.
