# Automation Operator Rail

Status: active operator rail
Risk: LOW docs/governance

Purpose: restore the original click-run workflow. The user gives work direction to ChatGPT; ChatGPT routes that work to Local Codex; Local Codex performs one scoped task, opens or updates one PR, and stops for ChatGPT verification.

## Original operating model

This is the core model and must not be inverted:

```text
User -> ChatGPT -> Local Codex -> GitHub PR -> ChatGPT verification -> User merge approval
```

The user should not have to rewrite task prompts, pick queue details, or manually intermediate every Codex task.

## Roles

| Role | Responsibility |
| --- | --- |
| User | Gives direction to ChatGPT, usually `진행`, and explicitly approves merge when needed. |
| ChatGPT | Chooses or normalizes the next task, routes the task to Local Codex when the local bridge is available, then checks Codex output and reports MERGE / FIX / HOLD / NEXT. ChatGPT does not edit while Codex is working. |
| Local Codex | Reads repo instructions, handles the current blocker or next safe task, edits files, runs checks, opens or updates one PR, and reports evidence. |
| GitHub | Source of truth for PR URL, head SHA, changed files, checks, review threads, issue state, and mergeability. |

## Command contract

When the user tells ChatGPT:

```text
진행
```

ChatGPT must route this into the Local Codex rail. Local Codex must then read the repo rail, pick the next safe automation task, execute one scoped unit, create or update one PR, report evidence, and stop.

Compatibility wording for checks: Codex must read the repo rail.

The target behavior is not user-to-Codex prompt copying. The target behavior is ChatGPT-to-Local-Codex handoff.

## Local Codex read order

1. `AGENTS.md`
2. `docs/QUEUE_ROUTER.md`
3. `docs/AUTOMATION_OPERATOR_RAIL.md`
4. active queue from the router, currently `docs/queues/AUTOMATION_PLATFORM.md`
5. `docs/LOCAL_CODEX_RUNBOOK.md`
6. issue `#23` latest automation status comments
7. open PRs, failed checks, unresolved review threads
8. focused reference docs only when needed

## Task selection rule

Before choosing new work, Local Codex must check:

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

Local Codex must not touch restricted runtime, data, security, release, or product areas unless the owner/ChatGPT explicitly scopes that work. If unsure, report HOLD.

## Required Local Codex output

Every Local Codex run must end with:

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

Local Codex does not merge.

ChatGPT checks the PR after Local Codex says it is done. ChatGPT must not edit files, PR body, or review threads while Local Codex is working.

Merge is allowed only after the user explicitly says to merge and GitHub evidence is green.

## One-run boundary

One `진행` equals one scoped unit:

```text
ChatGPT routes -> Local Codex picks one task -> edit -> validate -> PR -> report -> stop
```

Do not silently continue to another task after opening a PR.

## Main workflow

```text
User tells ChatGPT 진행 -> ChatGPT routes -> Local Codex works -> ChatGPT checks -> User approves merge
```

Compatibility wording for checks: User says 진행 -> Codex works -> ChatGPT checks -> User approves merge.
