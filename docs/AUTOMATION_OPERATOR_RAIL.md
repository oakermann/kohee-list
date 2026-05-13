# Automation Operator Rail

Status: active operator rail
Risk: LOW docs/governance

Purpose: restore the original click-run workflow. The user says `진행`; Codex reads this rail, selects the next safe task, opens a scoped PR, and stops for ChatGPT verification.

## Roles

| Role | Responsibility |
| --- | --- |
| User | Says `진행`, gives direction, and explicitly approves merge when needed. |
| ChatGPT | Plans at a high level, checks Codex output, finds errors, and gives MERGE / FIX / HOLD / NEXT. ChatGPT does not edit while Codex is working. |
| Codex | Reads repo instructions, selects the next safe task, edits files, runs checks, opens PR, and reports evidence. |
| GitHub | Source of truth for PR URL, head SHA, changed files, checks, review threads, issue state, and mergeability. |

## Command contract

When the user says:

```text
진행
```

Codex must read the repo rail, pick the next safe automation task, execute one scoped unit, create or update one PR, report evidence, and stop.

The user should not need to rewrite task prompts for every task.

## Codex read order

1. `AGENTS.md`
2. `docs/QUEUE_ROUTER.md`
3. `docs/AUTOMATION_OPERATOR_RAIL.md`
4. active queue from the router, currently `docs/queues/AUTOMATION_PLATFORM.md`
5. `docs/LOCAL_CODEX_RUNBOOK.md`
6. issue `#23` latest automation status comments
7. open PRs, failed checks, unresolved review threads
8. focused reference docs only when needed

## Task selection rule

Before choosing new work, Codex must check:

1. Open PRs.
2. Failed checks.
3. Unresolved review threads.
4. issue `#23` blockers.
5. Active queue next action.

| Condition | Action |
| --- | --- |
| Open PR exists | Work that PR first; do not start new work. |
| Required check failed | Fix the failing PR or report FIX_REQUIRED. |
| Unresolved review thread exists | Address it or report HOLD/FIX_REQUIRED. |
| issue `#23` has active blocker | Work blocker or report HOLD. |
| No blockers and next task is LOW/MEDIUM | Execute one scoped task. |
| Next task is HIGH/HOLD | Do not implement; report HOLD. |

## Restricted work

Codex must not touch restricted runtime, data, security, release, or product areas unless the owner/ChatGPT explicitly scopes that work. If unsure, report HOLD.

## Required Codex output

Every Codex run must end with:

```text
Status:
Blocker:
Next action:
Evidence:
- PR URL:
- head SHA:
- changed files:
- checks:
- review threads:
- issue state:
- restricted areas touched:
```

## Merge rule

Codex does not merge.

ChatGPT only checks the PR after Codex says it is done. ChatGPT must not edit files, PR body, or review threads while Codex is working.

Merge is allowed only after the user explicitly says to merge and GitHub evidence is green.

## One-run boundary

One `진행` equals one scoped unit:

```text
pick one task -> edit -> validate -> PR -> report -> stop
```

Do not silently continue to another task after opening a PR.

## Main workflow

```text
User says 진행 -> Codex works -> ChatGPT checks -> User approves merge
```
