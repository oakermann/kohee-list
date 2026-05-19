# KOHEE Data Policy

Last updated: 2026-05-19

## Public Data Policy

Public `/data` is the public product surface. It may expose only approved,
non-deleted cafes and only public-safe fields.

Public filter:

```sql
status = 'approved' AND deleted_at IS NULL
```

Candidate, hidden/hold, rejected, deleted, duplicate-suspected, and internal
review rows must stay private.

## Private/Internal Fields

The following must remain internal:

- submitter identity/contact
- admin/operator identity
- internal notes
- review memos
- evidence URLs
- confidence levels
- hold reasons
- hidden/deleted metadata
- duplicate flags unless explicitly made public-safe
- audit logs

## User Submissions

- User submissions are inputs for review, not public content.
- Accepting a submission for review does not approve it for public exposure.
- Submission approval should stage a cafe for candidate/admin review unless a
  separate explicit admin public-approval path is used.

## Review CSV Exports

Candidate review CSV:

- Used for candidate review.
- Must preserve original data and add suggested/review fields.
- Must not publish cafes.

Hold review CSV:

- Used for hidden/hold review.
- Must preserve hold state and reasons internally.
- Must not publish cafes.

Approved review CSV:

- Used to inspect already approved cafes.
- Must not bypass admin review or overwrite protected fields.

All-review export:

- Deferred unless explicitly approved.
- Must not mix public and internal data in a way that risks accidental publish.

## CSV Import/Reset Rules

- CSV import/reset must not directly publish cafes.
- CSV `status=approved` must stage as candidate or require separate explicit
  admin approval.
- Reviewed CSV must never automatically publish cafes.
- Protected fields must not be blindly overwritten from CSV.
- Reset behavior is HIGH/HOLD unless explicitly scoped and approved.

## Evidence And Verification

- Evidence/confidence/review notes remain internal.
- Any uncertain external verification must be marked uncertain instead of
  asserted.
- Duplicate handling must be conservative. Potential duplicates should be held,
  reviewed, or flagged internally rather than merged/destructively changed
  without approval.
