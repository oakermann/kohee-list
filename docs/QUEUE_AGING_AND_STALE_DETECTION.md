# KOHEE Queue Aging and Stale Detection

## Purpose

Define non-destructive aging rules for branches, PRs, command issues, and workflow runs.

This is report-only until a separate user-approved automation phase.

## Principles

- Time alone is not enough to mark work stale.
- Stale detection requires no recent activity and no terminal evidence.
- HOLD items are not stale merely because they are old.
- ACTIVE long-lived control issues, such as issue #23, must not be auto-closed.

## Candidate states

### STALE_CANDIDATE

A queue item appears inactive and should be reviewed.

Signals:

- no recent commits
- no recent comments
- no open PR activity
- no workflow activity
- no KOHEE_STATUS terminal state

### STALE

A stale candidate has been reviewed and confirmed inactive.

### SUPERSEDED

A newer issue, branch, PR, or merged commit replaced the original item.

### HOLD

A user or policy decision intentionally blocks work.

## Branch aging

Report as STALE_CANDIDATE when:

- branch is not protected
- branch is not main/master
- branch has no linked open PR
- branch has no recent commit activity
- branch name does not match HIGH/HOLD/control-plane patterns

Report as REVIEW_REQUIRED when:

- branch has a closed unmerged PR
- branch has unclear ownership
- branch name suggests retry/fix/high-risk work

Report as SAFE_DELETE_CANDIDATE only when:

- linked PR is merged
- branch is not protected
- branch head is included in merged PR history or otherwise verified by GitHub evidence

## PR aging

Report as STALE_PR_CANDIDATE when:

- PR is open
- checks are not actively running
- no recent comments/commits
- no explicit HOLD reason

Report as STATUS_ONLY_PR_REVIEW when:

- PR body/title looks like a TODO/status note
- PR has no meaningful repo change unit

## Command issue aging

Report as STALE_COMMAND_CANDIDATE when:

- issue is open
- body contains KOHEE_COMMAND
- no KOHEE_STATUS terminal state exists
- no recent activity

Do not report as stale when:

- issue is #23 active control issue
- issue contains HOLD_USER or HOLD_HIGH evidence
- issue is a long-lived tracking issue by policy

## Future automation phases

Phase 1:

- report-only GitHub Actions summary

Phase 2:

- issue #23 report comment

Phase 3:

- ACTIVE_QUEUE sync PR

Phase 4:

- user-approved cleanup PR or branch deletion automation

## Non-goals

- no automatic branch deletion
- no automatic issue close
- no automatic PR close
- no production deploy behavior
