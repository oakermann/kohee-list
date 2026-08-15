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

- Phase 2 (tab state & data routing) and Phase 3 (contextual CSV exports) have landed in `assets/admin.js` (`state.reviewConsoleTab` from line 23; `renderReviewConsoleTabCounts` and `renderReviewConsole` from line 679 routing loaded submissions and cafes into compact rows; `renderReviewConsoleExportAction` giving tabs contextual export actions).
- Phase 4 (row detail expansion / drawer) is the next open step.
- Phase 5 (cleanup of old scattered boxes) is **BLOCKED and UNSAFE**: removing section `#legacy-review-panel` in `admin.html` (starting line 157, marked as fallback) is blocked until the compact console directly owns the CSV and cafe list elements rather than hiding the panel that owns them. `#legacy-review-panel` still contains live implementations for 11 elements bound in `assets/admin.js` (including CSV file input referenced 8 times, cafe list, cafe search, cafe count, CSV download, dry run, upload, and reset). Deleting `#legacy-review-panel` would orphan CSV import and reset workflows, which repository safety rules forbid changing.
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
