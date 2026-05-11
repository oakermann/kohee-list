# KOHEE Queue State Machine

Status: proposed
Risk: LOW / GOVERNANCE
Track: MOBILE_TRACK for design, LOCAL_TRACK for implementation tests

This document defines status words for command issues, maintenance audit, and future GitHub App Worker decisions.

It does not change runtime behavior.

## Canonical states

Use these as top-level states:

```text
QUEUED
ACTIVE
PATCH_READY
PR_OPEN
REVIEWING
MERGED
DONE_NO_DEPLOY
DONE_DEPLOYED
HOLD
BLOCKED
STALE_CANDIDATE
STALE
SUPERSEDED
```

## HOLD is a state, not many states

Do not create canonical states like:

```text
HOLD_HIGH
HOLD_USER
```

Use:

```yaml
state: HOLD
blocker: HOLD_HIGH_RISK | HOLD_USER_APPROVAL | HOLD_SCOPE_CONFLICT | HOLD_TOOL_PERMISSION | HOLD_SECRET_REQUIRED
```

## Stale rules

Do not mark any inactive item as stale just because it is old.

A queued item may become stale only when all are true:

- state is `QUEUED`
- no later `KOHEE_STATUS` comment exists
- no PR activity exists
- no acknowledgement evidence exists
- the configured stale threshold has passed

Suggested transition:

```text
QUEUED -> STALE_CANDIDATE -> STALE
```

Use `STALE_CANDIDATE` before any cleanup or escalation.

## Terminal states

Terminal states:

```text
MERGED
DONE_NO_DEPLOY
DONE_DEPLOYED
HOLD
BLOCKED
SUPERSEDED
STALE
```

Terminal means a new command can proceed without treating the prior item as an active conflict.

## Evidence fields

Where possible, status records should include:

```yaml
KOHEE_STATUS:
  state:
  blocker:
  risk:
  lane:
  active_pr:
  head_sha:
  checks:
  review_threads:
  next_action:
  evidence:
```

Do not claim `PR_OPEN` without an actual GitHub PR URL.

## Cleanup behavior

- `SUPERSEDED` means a newer PR/issue replaced the item.
- `BLOCKED` means action is stopped by a specific known blocker.
- `HOLD` means user approval or HIGH-risk boundary is required.
- `STALE` means the queued item lacks evidence after stale checks.

No issue close, branch delete, or auto-merge behavior is implied by this document.
