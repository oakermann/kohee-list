# PR / Branch Hygiene Audit

Last updated: 2026-05-11
Status: audit-only
Track: MOBILE_TRACK

This document records PR/branch cleanup candidates. It does not delete branches, close issues, merge PRs, or change runtime code.

## Current open PRs

| PR | Status | Action |
| --- | --- | --- |
| #118 | HOLD_LOCAL_REQUIRED | Finish locally after `scripts/test-unit.mjs` manager direct-handler test rewrite. Do not merge while checks fail. |

## Recently completed governance PRs

| PR | Result | Notes |
| --- | --- | --- |
| #114 | merged | Added execution track routing hints. |
| #115 | merged | Synced memory backlog into ACTIVE_QUEUE. |
| #116 | merged | Added Phase 3, queue state, and document role planning docs. |
| #117 | merged | Reduced CODEX_AUTOMATION_STATUS to historical/reference. |

## Known cleanup candidates

- Old branches from merged docs/governance PRs may be deleted later after a read-only branch audit.
- Do not delete the `role-purge` branch while PR #118 is open.
- Do not auto-close issues or delete branches from cloud/mobile work.
- Use a future read-only maintenance audit before any branch cleanup.

## Recommended next audit

Track: `LOCAL_TRACK`

- List merged PR branches.
- List closed-unmerged PR branches.
- List branches with open PRs.
- List stale branches with no open PR.
- Produce a report only; no deletion.

## Safety boundaries

Do not perform:

- branch deletion
- issue close
- PR close
- auto-merge
- workflow/secrets changes
- production deploy
