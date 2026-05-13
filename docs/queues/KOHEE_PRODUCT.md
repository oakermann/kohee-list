# KOHEE Product Queue

Last updated: 2026-05-13
Purpose: KOHEE product work queue.

## Status

Paused while the automation-platform lane is active.

Local Codex must not start this queue unless:

1. `docs/queues/AUTOMATION_PLATFORM.md` reaches the platform maturity gate and the owner/ChatGPT allows product work to resume, or
2. the owner explicitly defers the automation lane for an urgent product bug.

## Product work after automation lane

### 1. KOHEE admin review console Phase 2/3

Risk: MEDIUM
Track: `LOCAL_TRACK`
Lane: FRONTEND_RENDERING
Scope:
- Compact review console UX.
- No API behavior change unless separately approved.
- No D1/schema/auth/CSV/public `/data` behavior change.

### 2. KOHEE submissions review CSV Phase 2

Risk: HIGH until scoped
Track: `LOCAL_TRACK`
Lane: CSV_PIPELINE
Scope:
- Audit/design first.
- No reviewed CSV apply workflow until explicitly approved.
- No CSV import/reset semantic change without owner approval.

### 3. Future project prep

Risk: LOW/MEDIUM depending on project
Track: `LOCAL_TRACK`
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Scope:
- News app automation plan.
- Blog/status site automation plan.
- Internal handover app automation plan.
- Product implementation starts only after project contract and risk policy exist.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
