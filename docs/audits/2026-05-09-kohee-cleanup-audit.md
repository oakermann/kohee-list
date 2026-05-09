# KOHEE Cleanup Audit - 2026-05-09

Issue: #11
Risk: LOW
Lane: GOVERNANCE
Scope: cleanup of obsolete local artifacts. No cloud runtime, server, API, D1, auth, CSV, or deploy workflow behavior was changed.

## Summary

The repository contained one tracked legacy frontend mirror, `aaaa/`, plus supporting references that kept it alive as a local/manual-check target. Root frontend files and `.pages-deploy/` are currently synchronized, but `aaaa/` was stale and differed from both. This created audit noise, especially for `innerHTML` searches and duplicated frontend copies.

Per direct user instruction, the cleanup baseline is now cloud operation plus GitHub automation. The stale local `aaaa/` mirror is unnecessary under that model and was removed in this PR.

## Evidence Checked

| Area | Evidence | Result |
| --- | --- | --- |
| `aaaa/` tracked files | `git ls-files` included `aaaa/*.html` and `aaaa/assets/*.js` before cleanup | Tracked legacy mirror existed |
| root vs `.pages-deploy` | File hashes match for root HTML/assets and `.pages-deploy` HTML/assets | Current deploy mirror is synchronized |
| `aaaa/` vs current frontend | File hashes differ for all checked `aaaa` HTML/JS files | `aaaa/` is stale |
| `sync-pages.ps1` | Default targets were `@(".", "aaaa")` | Removed `aaaa` target |
| `.prettierignore` | Included `aaaa/` and `kohee-index-fixed.zip` | Removed obsolete ignore entries |
| active docs | `README.md` described `aaaa/` as a local testing mirror | Updated to root + `.pages-deploy` model |
| governance docs | `AGENTS.md` says `No aaa/aaaa` | Current governance conflicts with tracked `aaaa/` |
| old branches | Remote branches still include merged PR branches `codex/implement-compact-admin-review-console`, `kohee-command-bridge-governance`, `kohee-full-audit-safe-patches` | Branch cleanup is available after confirmation |
| HIGH-risk carryover | `server/favorites.js` public exposure finding remains in `KOHEE_FINDINGS.md` | Not part of this cleanup audit |

## Cleanup Completed

- Removed tracked `aaaa/` legacy frontend mirror.
- Removed `aaaa` from the default `sync-pages.ps1` target list.
- Updated README sections that described `aaaa/` as a supported local mirror.
- Removed obsolete `aaaa/` and `kohee-index-fixed.zip` entries from `.prettierignore`.

## Remaining Safe Cleanup Candidates

- Prune merged remote branches after confirming no open PR depends on them.

## HOLD / Verify-Before-Delete Candidates

These should not be changed blindly:

- Branch cleanup: only delete merged branches after confirming each associated PR is merged and no active command references the branch.
- Any `innerHTML` cleanup in root or `.pages-deploy`: this is runtime/frontend behavior work and must remain outside this audit-only task.

## Recommended Implementation PR Plan

1. Keep `.pages-deploy/` as the cloud deployment source of truth.
2. Keep root HTML/assets as the only local synced mirror for quick checks.
3. Run `npm run check:deploy-sync`, `npm run audit:kohee`, and `git diff --check`.

## Out of Scope

The existing `server/favorites.js` public exposure risk is still HIGH/HOLD and requires separate user approval. This cleanup audit does not change server behavior, public API behavior, auth/session/security, D1/schema/migrations, CSV behavior, deploy workflow behavior, or runtime frontend behavior.
