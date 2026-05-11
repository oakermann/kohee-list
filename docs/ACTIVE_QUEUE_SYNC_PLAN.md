# KOHEE Active Queue Sync Plan

## Purpose

Reduce operational drift between chat context, GitHub issues, pull requests, branch state, workflow results, and `docs/KOHEE_ACTIVE_QUEUE.md`.

This is a read-only synchronization plan first. Automatic edits to ACTIVE_QUEUE must come later through a normal PR.

## Inputs

- open PRs
- recent merged PRs
- failed workflow runs
- open KOHEE command issues
- issue #23 state
- branch audit summary
- HIGH/HOLD issue state
- maintenance audit findings

## Report-only checks

A sync checker should report:

- ACTIVE_QUEUE says open PR count is zero but GitHub has open PRs
- ACTIVE_QUEUE lists completed P0 while an implementation PR is still open
- ACTIVE_QUEUE misses a HIGH/HOLD item
- ACTIVE_QUEUE references closed/superseded PRs as active
- ACTIVE_QUEUE misses stale branch cleanup debt
- ACTIVE_QUEUE states GitHub App Phase 2 is active when it is still deferred

## Future safe automation

Phase 1:

- GitHub Actions summary only
- no file write
- no issue close
- no branch deletion

Phase 2:

- open an ACTIVE_QUEUE sync PR
- still no direct push

Phase 3:

- let GitHub App Worker dry-run classify intended updates

## Non-goals

- no production runtime changes
- no D1/schema changes
- no CSV import/reset changes
- no public `/data` changes
- no automatic issue close
- no automatic branch deletion
