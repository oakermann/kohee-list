# Automation Platform Queue

Last updated: 2026-05-13
Purpose: active execution queue for the automation-platform lane.

## Rule

- This is the active queue while `docs/QUEUE_ROUTER.md` says `AUTOMATION_PLATFORM`.
- `docs/queues/KOHEE_PRODUCT.md` is paused until the maturity gate passes or the owner/ChatGPT explicitly defers this lane.
- Detailed grouping/order: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`.
- Extra hardening backlog: `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.
- Do not reorder this queue from supporting docs unless the owner/ChatGPT updates this file.
- Finish the automation/KOH​EE separation foundation first, then fold in extra hardening items as scoped follow-up work.

## Active lane

Automation platform foundation before product feature work.

## Execution model

### Stage A: automation separation foundation first

Complete items 1–3 before expanding into the broader extra-hardening backlog.

Goal:
- Separate automation-platform rules from KOHEE product rules.
- Define the common contracts and schemas.
- Prepare the future `dev-automation-platform` split without moving runtime code yet.

### Stage B: harden the separated platform

After Stage A, process items 4–6 with the relevant items from `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.

Goal:
- Make Local Codex execution, webhook intake, security posture, observability, and control-board foundations reliable.

### Stage C: maturity gate

Run item 7 after Stage A and Stage B are documented.

Goal:
- Decide whether project work can resume under the platform.

### 1. Boundary + schemas + task intake foundation

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 1.

Expected output:
- Automation platform vs KOHEE project boundary.
- Automation status schema.
- ChatGPT-first task intake and task queue schema.
- State transition policy.
- Project registry and catalog metadata.

### 2. Governance + safety design

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 2.

Expected output:
- Input trust boundary.
- Policy-as-code design.
- Approval ledger.
- Owner override rules.
- ADR policy.
- Freeze mode design.

### 3. Platform repo split + template foundation

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 3.

Expected output:
- Automation backlog split.
- Future `dev-automation-platform` repo split plan.
- Shared template seed plan.
- Project onboarding checklist.
- Golden path design.

### 4. Local Codex + webhook execution hardening

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 4.

Expected output:
- Local worker runbook hardening.
- Task lease and heartbeat design.
- Webhook duplicate/redelivery design.
- Reusable workflow baseline.
- Local task picker dry-run.
- Notification bridge design.
- Later approval packs.

### 5. Security + supply-chain posture

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 5.

Expected output:
- Credential and permission inventory.
- Per-project permission boundary.
- CI runner posture audit.
- Short-lived access readiness audit.
- Secret scanning baseline.
- Dependency update policy.
- Provenance/SBOM/Scorecard readiness.

### 6. Observability + control board foundation

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 6.

Expected output:
- Telemetry event schema.
- Event journal design.
- Drift audit.
- Metrics design.
- Snapshot/replay design.
- Catalog health audit.
- Control board data-source mapping.
- Read-only board MVP design.
- Budget/retry and recovery playbooks.

### 7. Platform maturity gate review

Use `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 7.

Expected output:
- Confirm whether the automation platform foundation is ready.
- Confirm which HOLD items remain.
- Decide whether KOHEE product work can resume under the platform.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
