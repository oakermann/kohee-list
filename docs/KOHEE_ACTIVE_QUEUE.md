# KOHEE Active Product Queue

Last updated: 2026-05-19

KOHEE LIST is a product repository. OAP is maintained separately.

## Current Rule

Work only on KOHEE cafe product tasks and product safety checks in this
repository. Do not add unattended worker, auto-merge, branch deletion, or
issue-close features here.

## Product Candidates

### 1. Admin console — rewritten 2026-10-21

Risk: MEDIUM

Done: `site/admin.html`/`admin.js`/`admin.css` rewritten as one tabbed console
(대기 = pending submissions + candidates · 공개 · 숨김 = hold/imported
hidden/rejected/deleted · 오류 = open reports · 운영 = visits, notice, CSV). `#legacy-review-panel` is gone; CSV import/reset live in 운영 with
the same endpoints. One dialog handles add/edit/submission review and fills
lat/lng from the existing `/geocode` (Nominatim) with the matched label shown.
Removed: role panel (server only accepts `user`, so it did nothing), read-only
user list, rejected/approved submission history, resolved error reports.
No API/D1/CSV behavior changed.

Next (each needs owner approval): Kakao place search for coordinates (owner REST
key, server change).

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
