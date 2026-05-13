# Automation Platform Queue

Last updated: 2026-05-13
Purpose: active execution queue for the automation-platform lane.

## Rule

- This is the active queue while `docs/QUEUE_ROUTER.md` says `AUTOMATION_PLATFORM`.
- `docs/AUTOMATION_OPERATOR_RAIL.md` is the active click-run operating rail for `진행` mode.
- `docs/queues/KOHEE_PRODUCT.md` is paused until the Phase 6 maturity gate passes or the owner/ChatGPT explicitly defers this lane.
- Detailed grouping/order: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`.
- Extra hardening backlog: `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.
- Do not reorder this queue from supporting docs unless the owner/ChatGPT updates this file.

## Active lane

Automation operator rail path: user says `진행` → Codex reads the rail → Codex handles the current blocker or next safe task → Codex opens/updates one PR → ChatGPT verifies.

## Current codebase baseline

The current repo already has earlier automation groundwork. Do not restart from zero.

Baseline to preserve:
- GitHub remains the source of truth for PRs, checks, review threads, issue state, and evidence.
- `docs/AUTOMATION_OPERATOR_RAIL.md` is the simple active workflow for user `진행` commands.
- Prior status/comment bridge and dry-run classifier work is already part of the automation foundation.
- Phase 5A local worker contract/runbook is recorded in `docs/LOCAL_CODEX_RUNBOOK.md`.
- Phase 5B dry-run picker plan is recorded in `docs/LOCAL_CODEX_RUNBOOK.md`.
- Phase 5C GitHub evidence validator plan is recorded in `docs/LOCAL_CODEX_RUNBOOK.md`.
- Phase 5D low/medium PR exercise loop plan is recorded in `docs/LOCAL_CODEX_RUNBOOK.md`.
- Phase 5E approval and notification readiness is recorded in `docs/LOCAL_CODEX_RUNBOOK.md`.
- Phase 6A/6B/6C docs exist as reference and maturity evidence.
- KOHEE product work remains paused while this automation lane is active.
- Existing HIGH/HOLD safety rules remain in force.

## Current next action

Use the operator rail.

Codex should:
1. read `AGENTS.md`, `docs/QUEUE_ROUTER.md`, and `docs/AUTOMATION_OPERATOR_RAIL.md`.
2. check open PRs, failed checks, unresolved review threads, and issue `#23` blockers.
3. if a blocker exists, handle that first.
4. if no blocker exists, choose one safe LOW/MEDIUM automation task.
5. edit, validate, open/update one PR, report evidence, and stop.

ChatGPT should:
1. not edit while Codex is working.
2. verify the PR after Codex reports done.
3. report only errors or MERGE/FIX/HOLD/NEXT.
4. merge only when the user explicitly says merge.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
