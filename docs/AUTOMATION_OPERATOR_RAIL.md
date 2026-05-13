# Automation Operator Rail

Status: active operator rail
Risk: LOW docs/governance

Purpose: define the click-run project-factory workflow. The platform must let the user direct work through ChatGPT, route it through the online execution layer, let Local Codex do the actual repo work, and use GitHub evidence for the final decision.

## Fixed operating model

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> Codex Review/review threads -> automation decision -> merge or hold
```

Compatibility wording for older queue checks:

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> automation decision -> merge or hold
```

This is a reusable project factory model, not a KOHEE-only helper.

## Roles

| Role | Responsibility |
| --- | --- |
| User | Gives direction such as `진행`, `확인`, or project-specific direction. Approves HIGH/HOLD work. |
| ChatGPT | Main orchestrator. Interprets the user request, chooses the next task, creates a task packet, reviews GitHub evidence, and reports MERGE / FIX / HOLD / NEXT. |
| Cloudflare Worker/GitHub App | Online execution arm. Records task packets and evidence in GitHub, updates issue/PR comments/status, and later performs allowed LOW/MEDIUM merge actions after gates pass. |
| GitHub | Task queue and evidence store: task packets, issue state, PRs, head SHA, changed files, checks, review threads, comments, and merge history. |
| Local Codex | Actual code worker. Reads task packets, edits locally, runs checks, commits, pushes, opens/updates PRs, and reports evidence. |
| Codex Review | PR reviewer/error detector. Creates review threads that must be resolved or explicitly waived before merge. |
| GitHub Actions | Validation gate for PR checks and release checks. |

## Command contract

When the user tells ChatGPT:

```text
진행
```

ChatGPT should not ask the user to hand-write a Codex prompt. ChatGPT should create or select a task packet and route it to the Cloudflare/GitHub App layer. Local Codex then reads the GitHub task packet and performs one scoped unit.

## Task packet contract

`TASK_PACKET` is the standard work order.

```text
task_id:
project:
lane:
risk:
mode:
goal:
allowed_files:
forbidden_areas:
checks:
stop_condition:
report_format:
merge_policy:
```

Default storage:
- issue `#23` until a dedicated queue issue or queue API exists.

## Task selection rule

Before routing new work, the automation must check:

1. open PRs.
2. failed checks.
3. unresolved review threads.
4. issue `#23` blockers.
5. active queue next action.

| Condition | Action |
| --- | --- |
| Open PR exists | Work that PR first; do not start unrelated work. |
| Required check failed | Fix the failing PR or report FIX_REQUIRED. |
| Unresolved review thread exists | Address it or report HOLD/FIX_REQUIRED. |
| issue `#23` has active blocker | Work blocker or report HOLD. |
| No blockers and next task is LOW/MEDIUM | Route one scoped task to Local Codex. |
| Next task is HIGH/HOLD | Do not route implementation; report HOLD for user approval. |

## Local Codex read order

1. `AGENTS.md`
2. `docs/QUEUE_ROUTER.md`
3. `docs/AUTOMATION_OPERATOR_RAIL.md`
4. active queue from the router, currently `docs/queues/AUTOMATION_PLATFORM.md`
5. `docs/LOCAL_CODEX_RUNBOOK.md`
6. GitHub task packet from issue `#23` or the active task queue
7. open PRs, failed checks, unresolved review threads
8. focused reference docs only when needed

## Merge policy

Local Codex does not merge.

LOW/MEDIUM may be merged by the automation layer only when all gates pass:

- project profile allows LOW/MEDIUM auto-merge.
- changed files match the task packet.
- forbidden areas are absent.
- `PR Validate` succeeds.
- `Validate` succeeds.
- unresolved review threads are absent.
- Codex Review threads are resolved or explicitly waived.
- head SHA is stable.
- policy-risk is LOW or approved MEDIUM.
- PR evidence is complete.

HIGH/HOLD never auto-merges. HIGH/HOLD requires explicit user approval.

## Restricted work

Hold instead of implementing when work touches:

- D1/schema/migration/data.
- auth/session/security behavior.
- CSV import/reset behavior.
- public data behavior.
- deploy or production settings.
- secrets/credentials.
- package/lockfile/install-script behavior without review.
- broad product work while automation lane is active.

## Required Local Codex output

Every Local Codex run must end with:

```text
Status:
Blocker:
Next action:
Evidence:
- task_id:
- project:
- PR URL:
- head SHA:
- changed files:
- checks:
- review threads:
- issue state:
- restricted areas touched:
- merge policy:
```

## One-run boundary

One routed task equals one scoped unit:

```text
task packet -> Local Codex picks one task -> edit -> validate -> PR -> report -> stop
```

Do not silently continue to another task after opening a PR.

## Main workflow

```text
User says 진행 -> ChatGPT creates task packet -> Cloudflare/GitHub App records it -> Local Codex works -> PR/checks/evidence -> LOW/MEDIUM auto-merge if gates pass, otherwise HOLD/FIX -> ChatGPT reports result
```
