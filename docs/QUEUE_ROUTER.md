# Queue Router

Last updated: 2026-05-13
Purpose: tell ChatGPT, Codex, and Local Codex which lane and operating rail are active.

## Active lane

`AUTOMATION_PLATFORM`

## Active operating rail

- `docs/AUTOMATION_OPERATOR_RAIL.md`

This is the active `진행` rail. When the user says `진행`, Codex should not wait for a fresh long prompt. Codex should read the rail, inspect GitHub evidence, choose the next safe task, open/update one PR, report, and stop.

## Active execution queue

- `docs/queues/AUTOMATION_PLATFORM.md`

## Paused product queue

- `docs/queues/KOHEE_PRODUCT.md`

## Supporting automation docs

Reference/backlog only unless the active rail or active queue asks for them:

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`
- `docs/AUTOMATION_PLATFORM_6B*.md`
- `docs/AUTOMATION_PLATFORM_6C_MATURITY_GATE.md`

## Rule for Local Codex

Local Codex must follow `docs/AUTOMATION_OPERATOR_RAIL.md` and `docs/queues/AUTOMATION_PLATFORM.md` while the active lane is `AUTOMATION_PLATFORM`.

Do not start `docs/queues/KOHEE_PRODUCT.md` unless:

1. the automation platform maturity gate passes, or
2. the owner/ChatGPT explicitly defers the automation lane for an urgent product bug.

## Current non-blocking hold

Remote merged branch cleanup is `HOLD_USER_APPROVAL` and must not block automation-platform work.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
