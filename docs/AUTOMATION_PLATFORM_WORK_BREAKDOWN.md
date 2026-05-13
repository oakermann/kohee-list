# Automation Platform Work Breakdown

Date: 2026-05-13
Status: planning / queue organization
Risk: LOW docs/governance

This document separates the automation-platform work by work nature and by execution order.

The goal is to stop treating the queue as one long undifferentiated list. `docs/queues/AUTOMATION_PLATFORM.md` is the active automation execution queue. `docs/queues/KOHEE_PRODUCT.md` is the paused KOHEE product queue. This document explains what kind of automation work each item is and why the order exists.

No runtime behavior, repo settings, workflow settings, deployment, credential, D1/schema, auth/session, CSV, or public `/data` behavior is changed by this document.

## 1. Work categories

### A. Platform boundary and ownership

Purpose: separate the automation platform from KOHEE product work.

Items:
- Automation platform / KOHEE project boundary definition
- Automation backlog separation
- Repo split preparation for `dev-automation-platform`
- Shared template seed plan
- Project onboarding checklist
- Project golden path scaffolding design
- Phase 6A reusable automation audit
- Phase 6B project automation prep templates

Output:
- Clear platform-vs-project boundary
- KOHEE treated as first managed project, not the platform itself
- Future `dev-automation-platform` repo plan
- Reusable templates and onboarding path

### B. Contracts, schemas, and task normalization

Purpose: make work machine-readable and stable before automation executes it.

Items:
- Automation status schema draft
- ChatGPT-first task intake and task queue schema design
- Automation state machine and transition policy
- Project registry manifest design
- Project catalog metadata design

Output:
- Common status schema
- Task schema for owner commands normalized by ChatGPT
- State transition rules
- Project registry/catalog model

### C. Policy, governance, and safety gates

Purpose: make rules explicit and eventually checkable.

Items:
- Policy-as-code validator design
- Approval ledger design
- Owner override protocol
- Protected environment approval gate design
- Automation ADR policy
- Platform maturity gate review

Output:
- Checkable policy direction
- Recorded approval model
- Owner override rules
- Major decisions recorded as ADRs
- A gate before product work resumes

### D. Security and supply-chain posture

Purpose: make the platform safe enough to manage multiple repos.

Items:
- Provenance and attestation readiness audit
- OpenSSF Scorecard baseline audit
- Dependency automation policy
- SBOM readiness roadmap
- GitHub Actions runner/runtime posture audit
- OIDC / short-lived credential readiness audit
- Secret scanning and push protection baseline
- Credential and permission inventory
- Per-project permission boundary

Output:
- Supply-chain evidence roadmap
- Baseline security posture
- Dependency update policy
- Permission and credential boundaries

### E. Local Codex execution control

Purpose: make Local Codex the default executor for eligible work without letting it improvise.

Items:
- Phase 5A local Codex worker runbook hardening
- Phase 5B local task picker dry-run
- Task lease and heartbeat design
- Approval notification bridge design
- Phase 5C local controlled worker loop owner approval pack

Output:
- Worktree/task-pick/stop rules
- Dry-run task picker
- Lease and heartbeat model
- Owner notification design
- Controlled loop approval pack

### F. Worker and event intake robustness

Purpose: make GitHub App Worker / webhook status flow reliable before stronger automation.

Items:
- LLM / automation input trust boundary design
- Webhook idempotency and redelivery design
- Reusable workflow baseline design
- Phase 4C native auto-merge owner approval pack

Output:
- Untrusted input boundaries
- Duplicate/redelivery-safe webhook design
- Shared workflow direction
- LOW-only native auto-merge approval pack

### G. Observability, reconciliation, and control board

Purpose: make the automation visible, auditable, and debuggable.

Items:
- Automation reconciliation / drift audit
- Automation telemetry event schema
- Automation event journal design
- Automation metrics / DORA-lite design
- Automation state snapshot / replay design
- Control board data-source mapping
- Control board MVP design
- Project catalog health and orphan audit
- Automation freeze mode design
- Automation incident and recovery playbook
- Automation budget and retry guard

Output:
- Drift detection plan
- Event and metric schemas
- Snapshot/replay plan
- Control board data model and MVP
- Freeze, recovery, and retry policy

### H. Product work after automation lane

Purpose: keep product work visible but paused until the automation platform is ready.

Items:
- KOHEE admin review console Phase 2/3
- KOHEE submissions review CSV Phase 2
- Future project prep for news app, blog/status site, and internal handover app

Output:
- Product work resumes under the automation platform instead of bypassing it

Queue location:
- Product work lives in `docs/queues/KOHEE_PRODUCT.md`.
- Do not run it from this work-breakdown document.

## 2. Recommended execution order

### Phase 0: Merge the queue rewrite

Goal: make the new direction visible on `main`.

Steps:
1. Verify PR #159 checks and review threads.
2. Merge PR #159 if green.
3. Use `docs/QUEUE_ROUTER.md` to find the active queue.
4. Use `docs/queues/AUTOMATION_PLATFORM.md` as the active automation execution queue while the router says `AUTOMATION_PLATFORM`.
5. Do not start product feature work before the platform boundary work begins.

### Phase 1: Define boundaries and contracts

Goal: stop mixing KOHEE product rules with automation-platform rules.

Run in this order:
1. Automation platform / KOHEE project boundary definition
2. Automation status schema draft
3. ChatGPT-first task intake and task queue schema design
4. Automation state machine and transition policy
5. Project registry manifest design
6. Project catalog metadata design

Why first:
- Every later task depends on knowing what a task, project, state, and managed repo are.

### Phase 2: Add governance and safety design

Goal: define how the platform decides, records, and blocks work.

Run in this order:
1. LLM / automation input trust boundary design
2. Policy-as-code validator design
3. Approval ledger design
4. Owner override protocol
5. Automation ADR policy
6. Automation freeze mode design

Why second:
- Local Codex and Worker should not execute stronger automation until trust boundaries and approval rules are explicit.

### Phase 3: Define repo split and multi-project foundation

Goal: prepare `dev-automation-platform` without breaking KOHEE.

Run in this order:
1. Automation backlog separation
2. Repo split preparation for `dev-automation-platform`
3. Shared template seed plan
4. Project onboarding checklist
5. Project golden path scaffolding design

Why third:
- The platform can be separated only after the common pieces are identified.

### Phase 4: Harden execution paths

Goal: make Local Codex and webhook-driven automation reliable.

Run in this order:
1. Phase 5A local Codex worker runbook hardening
2. Task lease and heartbeat design
3. Webhook idempotency and redelivery design
4. Reusable workflow baseline design
5. Phase 5B local task picker dry-run
6. Approval notification bridge design
7. Phase 4C native auto-merge owner approval pack
8. Phase 5C local controlled worker loop owner approval pack

Why fourth:
- Execution should become more automatic only after leases, idempotency, and shared validation are designed.

### Phase 5: Add security and supply-chain posture

Goal: make the platform safe enough to manage multiple repos over time.

Run in this order:
1. Credential and permission inventory
2. Per-project permission boundary
3. GitHub Actions runner/runtime posture audit
4. OIDC / short-lived credential readiness audit
5. Secret scanning and push protection baseline
6. Dependency automation policy
7. Provenance and attestation readiness audit
8. SBOM readiness roadmap
9. OpenSSF Scorecard baseline audit
10. Protected environment approval gate design

Why fifth:
- These should influence later implementation, but they do not need to block the initial schemas and boundaries.

### Phase 6: Make status observable and debuggable

Goal: build the foundation for the future control board.

Run in this order:
1. Automation telemetry event schema
2. Automation event journal design
3. Automation reconciliation / drift audit
4. Automation metrics / DORA-lite design
5. Automation state snapshot / replay design
6. Project catalog health and orphan audit
7. Control board data-source mapping
8. Control board MVP design
9. Automation budget and retry guard
10. Automation incident and recovery playbook

Why sixth:
- A board is useful only after the platform has a state model, registry, and event model.

### Phase 7: Maturity gate

Goal: decide if product work can resume under the platform.

Run:
- Platform maturity gate review

Gate must verify:
- Boundary exists
- Status/task schemas exist
- State machine exists
- Project registry/catalog exists
- Governance and approval docs exist
- Local worker safety design exists
- Security/supply-chain baseline exists
- Control board data mapping exists
- Remaining HOLD items are explicit

### Phase 8: Resume project work under the platform

Run only after the gate passes or owner/ChatGPT explicitly defers the automation lane.

Product queue:
- `docs/queues/KOHEE_PRODUCT.md`

## 3. Practical grouping for Local Codex

To avoid 40 tiny PRs, group work into small coherent PRs:

1. Boundary + status schema + task intake schema
2. State machine + registry + catalog
3. Trust boundary + policy-as-code + approval/override/ADR
4. Backlog split + repo split prep + templates + onboarding/golden path
5. Local worker runbook + lease + webhook idempotency
6. Security/supply-chain audits bundle
7. Telemetry/event/metrics/snapshot bundle
8. Control board mapping + MVP design + maturity gate

Each PR must stay docs/schema/design-only unless explicitly scoped otherwise.

## 4. Rule of thumb

Work nature decides grouping. Execution order decides priority.

- Category tells what kind of work it is.
- Phase tells when it should run.
- `docs/QUEUE_ROUTER.md` tells which queue is active.
- `docs/queues/AUTOMATION_PLATFORM.md` is the active automation execution queue while the router says `AUTOMATION_PLATFORM`.
- `docs/queues/KOHEE_PRODUCT.md` is paused product work.
- This document explains grouping and order; it is not the active queue.
