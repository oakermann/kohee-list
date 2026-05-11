# KOHEE Queue State Machine

## Purpose

Provide a stable orchestration lifecycle for:

- ChatGPT-main execution
- GitHub issue command flow
- future GitHub App Worker dry-run logic
- queue aging and stale detection
- maintenance audit classification

## Canonical states

### QUEUED

Work item exists but execution has not started.

### ANALYZING

ChatGPT/Codex is inspecting repo state, changed files, checks, and risk.

### PATCH_READY

A patch exists locally or conceptually but no GitHub PR URL exists yet.

### PR_OPEN

A real GitHub PR exists.

Required evidence:

- actual PR URL
- head SHA

### CHECKS_RUNNING

GitHub Actions checks are running.

### CHECKS_FAILED

One or more required checks failed.

### READY_TO_MERGE

Checks passed.
No unresolved review threads.
Merge gate clean.

### MERGED

PR merged into main.

### DEPLOYED

Deploy verification confirmed.

### HOLD

Blocked intentionally.

Required blocker/reason examples:

- `HOLD_HIGH_RISK`
- `HOLD_USER_APPROVAL`
- `HOLD_SCOPE_CONFLICT`
- `HOLD_CODEX_PR_PUBLISHING`

### SUPERSEDED

Replaced by newer PR/branch/workflow.

### STALE

Queued work with no evidence of progress after queue-aging checks.

## Transition rules

- QUEUED -> ANALYZING
- ANALYZING -> PATCH_READY
- PATCH_READY -> PR_OPEN
- PR_OPEN -> CHECKS_RUNNING
- CHECKS_RUNNING -> CHECKS_FAILED or READY_TO_MERGE
- READY_TO_MERGE -> MERGED
- MERGED -> DEPLOYED when applicable
- Any active state -> HOLD with blocker/reason
- Any active state -> SUPERSEDED
- QUEUED -> STALE only when no KOHEE_STATUS update, no PR activity, and no acknowledgement evidence exist

## Important rules

- `PR_OPEN` requires a real GitHub PR URL.
- `PATCH_READY` is not completion.
- `HOLD` is canonical; use blocker/reason values for high-risk or user-approval detail.
- GitHub evidence overrides local/Codex self-report.
- STALE cannot be inferred from time alone.
- review-thread resolution is required before READY_TO_MERGE.
- mergeable=true alone is not enough.

## Future integration

This state machine should later integrate with:

- maintenance audit automation
- queue aging detection
- ACTIVE_QUEUE synchronization
- GitHub App Worker dry-run decisions
- safe auto-merge eligibility
