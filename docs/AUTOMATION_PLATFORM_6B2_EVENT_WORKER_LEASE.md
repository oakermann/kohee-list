# Phase 6B-2 Event Worker Lease Contract

Date: 2026-05-13
Status: Phase 6B-2 design contract
Risk: LOW docs/governance

Purpose: define event intake, webhook idempotency, task lease, heartbeat, stuck detection, retry/rate-limit handling, and reusable workflow baseline for future automation workers.

Source relationship:
- Active queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Enterprise hardening map: `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`

No runtime behavior, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, or public `/data` behavior is changed by this document.

## 1. Event intake boundary

Events are inputs to decision-making, not automatic permission to act.

Accepted future event types:

| Event | Purpose | Default behavior |
| --- | --- | --- |
| PR opened/updated | Start or refresh evidence collection | Dry-run/evidence only |
| Check completed | Update PR evidence state | Decide FIX/HOLD/MERGE only after full validation |
| Review thread changed | Update blocker state | HOLD until resolved or explicitly waived |
| Issue comment command | Request task selection or approval | Treat as untrusted until matched to owner/ChatGPT intent |
| Queue document changed | Re-run queue/doc consistency checks | Verify lane and dependency group |
| Manual owner request | Create or advance task | Normalize through task intake schema |

Hard rule:
- No event should directly merge, deploy, close issues, delete branches, enable auto-merge, or start unattended loops.

## 2. Webhook idempotency design

Every event must have an idempotency key before future execution code is allowed.

Suggested key fields:

```text
provider:
repository:
event_type:
delivery_id:
pr_or_issue_number:
head_sha:
action:
received_at:
```

Rules:
- Duplicate delivery with the same key must not create duplicate work.
- Redelivery must update evidence state only if the event is newer or has a different head SHA.
- If head SHA changes, previously collected merge evidence becomes stale.
- Idempotency records should be retained long enough to cover GitHub redelivery windows and delayed worker retries.

## 3. Task lease model

A lease prevents two workers from editing the same task at the same time.

Required lease fields:

```text
lease_id:
task_id:
project:
lane:
owner:
branch:
expected_files:
forbidden_areas:
acquired_at:
expires_at:
heartbeat_at:
status:
```

Lease statuses:

| Status | Meaning |
| --- | --- |
| `LEASED` | Worker may work on the scoped task. |
| `HEARTBEAT_STALE` | Worker may be stuck; no new worker should take over without evidence. |
| `RELEASED` | Worker completed or stopped cleanly. |
| `EXPIRED` | Lease timed out and requires owner/ChatGPT review before takeover. |
| `ABANDONED` | Lease failed and must be recorded with reason. |

Rules:
- One branch/worktree per lease.
- Lease must list expected files before edits begin.
- Lease takeover requires evidence that the original worker stopped or expired.
- HIGH/HOLD work cannot be leased for execution without explicit approval.

## 4. Heartbeat and stuck detection

Heartbeat proves that a worker is still alive and working on the same scope.

Heartbeat fields:

```text
task_id:
lease_id:
head_sha:
current_step:
updated_files:
last_check_status:
blocker:
heartbeat_at:
```

Stuck conditions:

| Condition | Result |
| --- | --- |
| No heartbeat before lease expiry | `HEARTBEAT_STALE` |
| Head SHA changed outside worker evidence | HOLD |
| Check failed repeatedly without new fix | FIX_REQUIRED or HOLD |
| Worker changed files outside expected scope | HOLD |
| Worker attempts second task without closing current task | HOLD |
| Worker retry count exceeds budget | HOLD |

## 5. Retry and rate-limit policy

Retries must be bounded.

Rules:
- Retry failed network/API reads only when the operation is read-only or idempotent.
- Do not retry writes blindly.
- Do not retry merge calls without re-reading PR head SHA, checks, and review threads.
- Respect GitHub rate limits and back off instead of looping.
- If retry budget is exhausted, report HOLD with evidence.

Suggested retry budget:

| Operation | Max retry | Notes |
| --- | --- | --- |
| read PR metadata | 3 | backoff allowed |
| read checks/jobs | 3 | backoff allowed |
| read review threads | 3 | backoff allowed |
| update docs branch | 1 | re-fetch SHA before retry |
| create PR | 1 | verify duplicate PR first |
| merge PR | 0 automatic | re-run evidence validator before any retry |

## 6. Reusable workflow baseline

Reusable workflows should be introduced as read-only or validation-only first.

Baseline requirements:
- Minimal permissions by default.
- No secret access for pull-request validation unless explicitly required.
- Path filters for expensive or risky checks.
- Clear required-check naming.
- Artifact retention policy for evidence artifacts.
- No `pull_request_target` unless separately justified and approved.
- No deployment from generic validation workflows.

## 7. Future worker states

Future worker/control-plane state machine:

```text
EVENT_RECEIVED -> NORMALIZED -> DEDUPED -> READY_FOR_DRY_RUN
READY_FOR_DRY_RUN -> PICKED -> LEASED -> IN_PROGRESS
IN_PROGRESS -> PR_OPEN -> EVIDENCE_VALIDATION
EVIDENCE_VALIDATION -> MERGE_READY | FIX_REQUIRED | HOLD | CLOSED
MERGE_READY -> MERGED -> RELEASED
FIX_REQUIRED -> IN_PROGRESS
HOLD -> RELEASED
```

Rules:
- `MERGE_READY` is not the same as merged.
- `MERGED` requires a successful merge response and final PR evidence.
- `HOLD` releases execution but preserves blocker evidence.

## 8. Fallback path

If the future automation worker is unavailable:
- ChatGPT/owner may continue with manual GitHub evidence checks.
- Existing PRs remain source of truth.
- Do not start a second worker blindly.
- Do not assume a failed worker means the task is safe to re-run.
- Record the fallback reason in issue `#23` or the target PR.

## 9. Completion criteria

This lane is complete when:
- event intake boundary is documented.
- webhook idempotency design is documented.
- task lease model is documented.
- heartbeat and stuck detection are documented.
- retry/rate-limit policy is documented.
- reusable workflow baseline is documented.
- future worker states are documented.
- fallback path is documented.
- no runtime worker behavior is enabled by this document.
