# Queue Router

Last updated: 2026-05-13
Purpose: tell ChatGPT, Cloudflare/GitHub App automation, and Local Codex which lane and operating rail are active.

## Supreme rule

- `docs/AUTOMATION_CONSTITUTION.md` is the top-level automation constitution.
- If this router conflicts with the constitution, the constitution wins.
- Do not alter the top-level operating model unless the user explicitly asks to change the automation constitution.

## Active lane

`AUTOMATION_PLATFORM`

## Active operating rail

- `docs/AUTOMATION_OPERATOR_RAIL.md`

This is the active project-factory rail for `진행` mode.

Fixed operating model:

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> Codex Review/review threads -> automation decision -> merge or hold
```

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

## Rule for ChatGPT

ChatGPT interprets the user direction, chooses or normalizes the next task, and creates or requests a task packet. ChatGPT must not turn the user into the Codex prompt carrier.

## Rule for Cloudflare/GitHub App

Cloudflare Worker/GitHub App is the online execution arm. It records task packets and evidence in GitHub, updates issue/PR comments/status, and later performs allowed LOW/MEDIUM merge actions after evidence gates pass.

## Rule for Local Codex

Local Codex reads the GitHub task packet and performs the actual local repo work. Local Codex must follow `docs/AUTOMATION_CONSTITUTION.md`, `docs/AUTOMATION_OPERATOR_RAIL.md`, and `docs/queues/AUTOMATION_PLATFORM.md` while the active lane is `AUTOMATION_PLATFORM`.

Do not start `docs/queues/KOHEE_PRODUCT.md` unless:

1. the automation platform can safely manage product work, or
2. the owner/ChatGPT explicitly defers the automation lane for an urgent product bug.

## Current non-blocking hold

Remote merged branch cleanup is `HOLD_USER_APPROVAL` and must not block automation-platform work.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
