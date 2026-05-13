# Queue Router

Last updated: 2026-05-13
Purpose: tell ChatGPT, Codex, and Local Codex which queue is active.

## Active lane

`AUTOMATION_PLATFORM`

## Active execution queue

- `docs/queues/AUTOMATION_PLATFORM.md`

## Paused product queue

- `docs/queues/KOHEE_PRODUCT.md`

## Supporting automation docs

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`

## Rule for Local Codex

Local Codex must follow `docs/queues/AUTOMATION_PLATFORM.md` while the active lane is `AUTOMATION_PLATFORM`.

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
