# KOHEE Active Product Queue

Last updated: 2026-05-19

KOHEE LIST is a product repository. OAP is maintained separately.

## Current Rule

Work only on KOHEE cafe product tasks and product safety checks in this
repository. Do not add unattended worker, auto-merge, branch deletion, or
issue-close features here.

## Product Candidates

### 1. Admin review console Phase 4 (Phase 2/3 Landed, Phase 5 Blocked)

Risk: MEDIUM

Scope:

- Phase 2 (tab state & data routing) has landed in `assets/admin.js`. Phase 3 review CSV exports and CSV reset were removed on 2026-10-20.
- Phase 4 (row detail expansion / drawer) is the next open step.
- Phase 5 (remove `#legacy-review-panel`): the panel still owns CSV import (file input, dry run, upload) and the cafe list, so move those into the console first.
- Improve review-console UX.
- Do not change API behavior unless separately approved.
- Do not change D1/schema/auth/CSV/public `/data` behavior.

### 3. Smoke-check safety split

Risk: LOW/MEDIUM depending on files

Scope:

- Separate smoke check targets into --public (public page and public data checks), --admin (admin page check), and --worker (Worker health, DB health, version, and public data checks), while preserving --pages (--public plus --admin) and default full-run behavior.
- Preserve existing deploy and product behavior.

## HOLD

- D1/schema/migration changes
- auth/session/security behavior changes
- CSV import behavior changes
- public `/data` behavior changes
- cafe lifecycle behavior changes
- production deploy/secrets/config changes
