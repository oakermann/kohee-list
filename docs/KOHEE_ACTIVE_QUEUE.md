# KOHEE Active Product Queue

Last updated: 2026-05-19

KOHEE LIST is a product repository. OAP is maintained separately.

## Current Rule

Work only on KOHEE cafe product tasks and product safety checks in this
repository. Do not add unattended worker, auto-merge, branch deletion, or
issue-close features here.

## Product Candidates

### 1. Admin review console Phase 2/3

Risk: MEDIUM

Scope:

- Improve review-console UX.
- Do not change API behavior unless separately approved.
- Do not change D1/schema/auth/CSV/public `/data` behavior.

### 2. Submissions review CSV Phase 2 design

Risk: HIGH until scoped

Scope:

- Audit/design first.
- No reviewed CSV apply workflow until explicitly approved.
- No CSV import/reset semantic change without owner approval.

### 3. Smoke-check safety split

Risk: LOW/MEDIUM depending on files

Scope:

- Separate smoke check targets into --public (public page and public data checks), --admin (admin page check), and --worker (Worker health, DB health, version, and public data checks), while preserving --pages (--public plus --admin) and default full-run behavior.
- Preserve existing deploy and product behavior.

## HOLD

- D1/schema/migration changes
- auth/session/security behavior changes
- CSV import/reset behavior changes
- public `/data` behavior changes
- cafe lifecycle behavior changes
- production deploy/secrets/config changes
