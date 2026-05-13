# Automation Active Queue

Last updated: 2026-05-13
Purpose: active execution queue for the automation-platform lane.

## Rule

- Local Codex must read this file first while the automation lane is active.
- KOHEE product work is paused in `docs/KOHEE_PRODUCT_QUEUE.md`.
- Detailed grouping and order live in `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`.
- Extra hardening ideas live in `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.
- Do not reorder this queue from supporting docs unless the owner or ChatGPT updates this file.

## Active lane

Automation platform foundation before product feature work.

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
