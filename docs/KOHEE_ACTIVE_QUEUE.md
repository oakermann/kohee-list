# KOHEE Active Queue Router

Last updated: 2026-05-13
Purpose: route Codex to the correct queue.

## Current active lane

`AUTOMATION_PLATFORM`

## Source of truth

- Active automation execution queue: `docs/AUTOMATION_ACTIVE_QUEUE.md`
- Paused KOHEE product queue: `docs/KOHEE_PRODUCT_QUEUE.md`
- Automation work breakdown: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Extra automation hardening backlog: `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`

## Rule for Local Codex

Local Codex must read and follow `docs/AUTOMATION_ACTIVE_QUEUE.md` first.

Do not start KOHEE product work from `docs/KOHEE_PRODUCT_QUEUE.md` unless:

1. the automation platform maturity gate passes, or
2. the owner/ChatGPT explicitly defers the automation lane for an urgent product bug.

## Current blocker

Remote merged branch cleanup is `HOLD_USER_APPROVAL` and must not block automation-platform work.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
