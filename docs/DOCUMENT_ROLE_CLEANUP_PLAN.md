# KOHEE Document Role Cleanup Plan

Status: proposed
Risk: LOW / GOVERNANCE
Track: MOBILE_TRACK

This plan reduces duplicate automation rules across documents without changing runtime behavior.

## Canonical roles

```text
KOHEE_MASTER_CONTEXT.md
= long-term policy and product/automation invariants

KOHEE_ACTIVE_QUEUE.md
= current state, blockers, next actions

DESIGN_REVIEW_LOG.md
= design decisions and rationale

WORK_SESSION_LOG.md
= GitHub execution evidence

LOCAL_CODEX_AUDIT_LOG.md
= local Codex commands, tests, and local verification

CODEX_AUTOMATION_STATUS.md
= historical/reference automation status

CODEX_WORKFLOW.md
= legacy/local Codex workflow reference unless updated
```

## Cleanup rules

- Current PR lists, current blockers, and next actions belong in ACTIVE_QUEUE.
- Long-term public data, CSV, lifecycle, risk, and role rules belong in MASTER_CONTEXT.
- Design decisions belong in DESIGN_REVIEW_LOG.
- Execution evidence belongs in WORK_SESSION_LOG or LOCAL_CODEX_AUDIT_LOG.
- Historical automation notes stay in CODEX_AUTOMATION_STATUS.
- Legacy Codex-local instructions stay in CODEX_WORKFLOW.

## Planned cleanup

1. Add a clear top note to CODEX_WORKFLOW that newer ChatGPT-main rules live in MASTER_CONTEXT and ACTIVE_QUEUE.
2. Remove or shorten stale current-state lists from CODEX_AUTOMATION_STATUS.
3. Avoid repeating Phase 2/3/4 automation rules across all docs.
4. Keep ACTIVE_QUEUE short and only current.
5. Keep this plan as a guide until the actual cleanup PR is run.

## Not in this plan

- Runtime code changes
- D1/schema changes
- auth/session changes
- public data behavior changes
- CSV import/reset changes
- production deploy behavior changes
