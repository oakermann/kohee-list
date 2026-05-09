# KOHEE Findings

Use this as the ongoing full-code audit ledger for active OPEN/HOLD/recent fixed items only.
Do not paste long logs here; link PRs, checks, issues, or review threads instead.
Archive or compact old/completed findings if this document grows too large.

| ID | Risk | Area | Finding | Auto-fix allowed | Status | PR/Issue |
| --- | --- | --- | --- | --- | --- | --- |
| KF-2026-05-08-001 | MEDIUM | Governance | KOHEE GitHub Command Bridge v1 governance added for GitHub-commanded ChatGPT/Codex work. | No | FIXED 2026-05-08 | PR #8 |
| KF-2026-05-09-001 | MEDIUM | Frontend rendering | Mypage favorite modal opened cafe-provided `instagram` and `beanShop` URLs without `safeHttpUrl`, and the account menu used `innerHTML` where DOM APIs were sufficient. | Yes | FIXED 2026-05-09 | PR #10 |
| KF-2026-05-09-002 | HIGH | Public exposure | `server/favorites.js` joined favorites to cafes without `status = 'approved' AND deleted_at IS NULL`; previously favorited candidate/deleted cafes could appear in authenticated user favorites. | No | FIXED 2026-05-09 | Issue #9 |
| KF-2026-05-09-003 | LOW | Cleanup | Tracked `aaaa/` legacy frontend mirror was stale, still referenced by `sync-pages.ps1` and README, and created duplicate frontend/`innerHTML` audit noise. | Yes | FIXED 2026-05-09 | Issue #11 |
| KF-2026-05-09-004 | LOW | Audit tooling | `audit:kohee` produced warning noise for `is-hidden`/`document.hidden`, authenticated mypage status labels, and implemented hold semantics that were already covered by code/tests. | Yes | FIXED 2026-05-09 | PR #16 |
