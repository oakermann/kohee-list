# KOHEE Safe Auto-Merge Guard

## Purpose

Define when safe LOW or MEDIUM pull requests may use GitHub native auto-merge.

Auto-merge must not bypass required checks, review-thread gates, or HIGH/HOLD policy.

## Allow

Auto-merge may be enabled only when:

- a real PR URL exists
- changed files are known
- the PR is not draft
- no review thread is unresolved
- the task is LOW or MEDIUM
- the change is inside its lane allowlist
- denied paths or denied behaviors are absent
- required checks can run normally

## Deny

Do not enable auto-merge for:

- HIGH or HOLD work
- schema or migration work
- auth, permission, or session policy work
- public data exposure changes
- CSV import or reset semantics
- production deploy or credential changes
- branch deletion or issue close automation
- broad unclear refactors

## Flow

1. Confirm risk and changed files.
2. Confirm review threads are clear.
3. Enable native auto-merge.
4. Let branch protection wait for checks.
5. Verify merged state later.

## Blockers

If auto-merge cannot be enabled, record the exact blocker and continue other independent LOW/MEDIUM lanes when safe.
