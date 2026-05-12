# Commercial Codebase Gap Audit

Status: AUDIT_ONLY / DRAFT_PR
Date: 2026-05-12
Base: `main` at `246d086f6c12a3ace908db0d09abc471b52e3e9d`
Issue: `#23` / `commercial-codebase-gap-audit`

## Scope

This audit records codebase gaps toward a cleaner commercial baseline. It does
not change runtime, server/API, auth, D1, frontend, deploy, CSV import/reset,
public `/data`, manager behavior, or auto-merge settings.

Checked local evidence:

- `docs/KOHEE_ACTIVE_QUEUE.md`
- `docs/LOCAL_CODEX_RUNBOOK.md`
- issue `#23` task queue comments
- `server/cafes.js`
- `server/csv.js`
- `server/shared.js`
- `server/users.js`
- `assets/admin.js`
- `scripts/audit-kohee.mjs`
- `scripts/check-deploy-sync.mjs`
- `scripts/smoke-check.mjs`
- `scripts/smoke-test.ps1`
- `.github/workflows/deploy.yml`
- `docs/DATA_LIFECYCLE_PLAN.md`
- `docs/D1_MIGRATION_RUNBOOK.md`
- `docs/BACKUP_RETENTION_SECURITY.md`

## Executive summary

The current main branch is in a better commercial state than the older planning
docs imply: Phase 2 webhook delivery is verified, the active queue has one
current local audit blocker, `audit:kohee` passes, public `/data` selects only
approved non-deleted cafe fields, and CSV import/reset remains admin-only with
candidate-first staging.

The main remaining gap is not a single production bug. It is a cleanup backlog
around legacy compatibility surfaces, smoke/tooling precision, and operational
runbooks. The safest next work is LOW-risk tooling/test tightening. HIGH-risk
D1/schema, public API, CSV semantics, auth, and deploy changes should remain
HOLD.

## Findings

### [P1] Legacy manager and manager_pick compatibility is still visible outside the final target model

- Risk: HIGH if implemented as schema/auth/runtime cleanup; LOW if handled as
  audit/tooling-only documentation or tests.
- Current evidence:
  - `server/shared.js` still defines `ROLES = ["user", "manager", "admin"]`.
  - `schema.sql` still includes the `manager` role CHECK and
    `manager_pick` columns.
  - `server/cafes.js` still has `applyPickPermission()` and `toCafeResponse()`
    manager_pick compatibility, while public `/data` no longer selects
    `manager_pick`.
  - `server/users.js` maps non-admin public user roles to `user` and rejects
    setting roles other than `user`.
  - `scripts/smoke-check.mjs` still allows `manager_pick` in public data
    shape, which is too permissive after PR #118.
  - `scripts/smoke-test.ps1` still contains manager-role smoke paths that no
    longer match the runtime target model.
- Recommended patch:
  - Next LOW PR: tighten smoke/tooling expectations so public smoke treats
    `manager_pick` as forbidden or at least no longer allowed.
  - Next LOW/MEDIUM PR: update destructive live smoke docs/scripts to avoid
    manager promotion paths unless explicitly running a legacy-compat check.
- Do not touch:
  - `schema.sql`, migrations, D1 enum cleanup, role policy, or runtime auth
    behavior without explicit HIGH/HOLD approval.
- Next Codex/PR candidate:
  - `LOW / DEPLOY_SAFETY`: update `scripts/smoke-check.mjs` public key policy
    and tests only.

### [P1] Full live smoke script has destructive/admin assumptions and needs a safer split

- Risk: MEDIUM/HIGH depending on execution target.
- Current evidence:
  - `scripts/smoke-check.mjs` is read-only and suitable for Pages/Worker smoke.
  - `scripts/smoke-test.ps1 -Mode full` promotes users through remote D1,
    creates cafe/submission/error-report data, mutates notices, and attempts
    cleanup afterward.
- Recommended patch:
  - Keep `scripts/smoke-check.mjs` as the default commercial release smoke.
  - Document `scripts/smoke-test.ps1 -Mode full` as manual destructive
    production-adjacent smoke requiring explicit approval, or add a safer
    non-production default guard in a separate PR.
- Do not touch:
  - D1, production deploy, secrets, or CSV behavior in this audit PR.
- Next Codex/PR candidate:
  - `LOW / DEPLOY_SAFETY`: docs/tooling guard around full live smoke.

### [P2] Root vs .pages-deploy sync is covered, but the model remains fragile

- Risk: MEDIUM for frontend changes.
- Current evidence:
  - `scripts/check-deploy-sync.mjs` compares root HTML/assets with
    `.pages-deploy`.
  - `audit:kohee` enforces admin asset cache-bust version matches.
  - `.github/workflows/deploy.yml` deploys `.pages-deploy` when frontend
    changes are detected.
- Gap:
  - Frontend work still has two editable copies, so every frontend PR must
    remember sync and cache-bust rules.
- Recommended patch:
  - Keep the current guard mandatory.
  - Later, consider making root the only edited source and `.pages-deploy` a
    generated artifact, but only as a focused deploy-safety plan.
- Do not touch:
  - Deploy workflow behavior or production Pages config in this audit PR.
- Next Codex/PR candidate:
  - `LOW / DEPLOY_SAFETY`: add a short contributor note for frontend sync
    checklist if reviewers keep missing it.

### [P2] Public/internal API contract coverage is strong but should become stricter around retired fields

- Risk: LOW for tooling; HIGH for public API behavior changes.
- Current evidence:
  - `server/cafes.js` public `/data` selects public cafe fields only and filters
    `status = 'approved' AND deleted_at IS NULL`.
  - `scripts/test-unit.mjs` covers public data filtering, favorite filtering,
    deleted filtering, and redaction paths.
  - `scripts/smoke-check.mjs` validates live public data against public and
    forbidden key sets.
- Gap:
  - `manager_pick` is still in the live smoke public allowlist even though the
    public query no longer selects it.
- Recommended patch:
  - Update smoke contract to fail if retired/internal fields reappear in live
    `/data`.
- Do not touch:
  - Public `/data` behavior in this audit PR.
- Next Codex/PR candidate:
  - Same as P1 smoke-key tightening.

### [P2] CSV lifecycle tests exist, but reviewed CSV apply remains intentionally unimplemented

- Risk: HIGH for reviewed upload/apply behavior; LOW for export/test docs.
- Current evidence:
  - `server/csv.js` stages imported rows as `candidate` unless `hidden` is
    explicitly provided.
  - `resetCsv()` uses soft delete plus rollback snapshots on failure.
  - Review exports exist for candidates, hold, approved, and submissions.
  - `scripts/test-unit.mjs` and `scripts/test-csv-export.mjs` cover export and
    lifecycle cases.
- Gap:
  - Reviewed CSV upload/apply is still a future HIGH-risk design area, not a
    runtime feature.
  - Reset rollback is compensation-based rather than a true transactional D1
    design.
- Recommended patch:
  - Keep reviewed CSV upload/apply in HOLD until protected fields, staging, and
    rollback are explicitly designed.
  - If needed, add more tests around existing export-only paths before any
    upload/apply work.
- Do not touch:
  - CSV import/reset semantics, reviewed CSV apply/upload, D1 transactions.
- Next Codex/PR candidate:
  - `LOW / CSV_PIPELINE`: export-only test additions if a concrete missing
    assertion is found.

### [P2] Admin review console is the highest-value frontend cleanup, but not a prerequisite for safety

- Risk: MEDIUM frontend behavior if implemented.
- Current evidence:
  - Existing audit:
    `docs/audits/2026-05-08-frontend-rendering-admin-review-console-audit.md`.
  - `assets/admin.js` has active review console functions:
    `renderReviewConsole()`, `reviewExportFiles()`,
    `downloadReviewConsoleCsv()`.
- Gap:
  - Admin review is still spread across a large admin surface.
  - The next commercial UX improvement is workflow clarity, not new data power.
- Recommended patch:
  - Implement admin review console Phase 2/3 only as a focused
    `FRONTEND_RENDERING` PR with root/.pages-deploy sync and no API behavior
    changes.
- Do not touch:
  - Auth, role policy, CSV apply, public data behavior.
- Next Codex/PR candidate:
  - `MEDIUM / FRONTEND_RENDERING`: compact review console UI, no behavior
    change.

### [P2] Minimal browser/E2E smoke candidates should be separated from destructive full smoke

- Risk: LOW/MEDIUM for test-only additions.
- Current evidence:
  - `scripts/smoke-check.mjs` covers Pages home/admin and Worker health/db,
    version, and public data.
  - There is no minimal browser smoke for client rendering/navigation.
- Recommended candidates:
  - Pages loads home and admin HTML.
  - Home renders a non-empty cafe list from `/data`.
  - Login page renders and CSRF/session route can be checked in a mocked/local
    environment.
  - Admin page blocks unauthenticated use and does not expose manager role
    controls.
- Do not touch:
  - Production D1 or live mutating admin flows in an E2E smoke unless explicitly
    approved.
- Next Codex/PR candidate:
  - `LOW / DEPLOY_SAFETY`: add read-only browser smoke candidate docs first;
    implement later if CI browser tooling is approved.

### [P3] audit:kohee is passing, but its next high-signal gain is retired-field detection

- Risk: LOW tooling.
- Current evidence:
  - `npm run audit:kohee` passes with warnings=0.
  - It checks invariants, deploy sync/cache-bust, D1 auto-apply absence, and
    legacy `aaa/aaaa` references.
- Gap:
  - It does not currently flag live smoke allowlist drift such as
    `manager_pick` remaining allowed in public data smoke.
- Recommended patch:
  - Add a narrow audit check that retired public fields are not in
    `PUBLIC_CAFE_KEYS` or are explicitly listed as legacy compatibility.
- Do not touch:
  - Deploy workflow behavior.
- Next Codex/PR candidate:
  - `LOW / DEPLOY_SAFETY`: audit-only guard for retired public fields.

### [P3] Release and rollback docs exist, but command choice needs sharper default guidance

- Risk: LOW docs, HIGH if changing production operations.
- Current evidence:
  - `docs/D1_MIGRATION_RUNBOOK.md` covers manual migration, backup, rollback,
    and D1 deployment gates.
  - `docs/BACKUP_RETENTION_SECURITY.md` covers backup retention and restore
    posture.
  - `.github/workflows/deploy.yml` records deploy summaries and blocks D1 auto
    migration.
- Gap:
  - Operators can still choose among several scripts without a crisp
    "default safe smoke" versus "manual destructive smoke" distinction.
- Recommended patch:
  - Add a short release/runbook decision table:
    `smoke-check.mjs` for default read-only live smoke,
    `smoke-test.ps1 -Mode full` only with explicit approval,
    D1 migration runbook only for HIGH/HOLD.
- Do not touch:
  - Deploy workflow, Cloudflare secrets, D1 remote data.
- Next Codex/PR candidate:
  - `LOW / GOVERNANCE`: docs-only runbook command decision table.

## Recommended next task order

1. `LOW / DEPLOY_SAFETY`: tighten public smoke retired-field policy around
   `manager_pick`.
2. `LOW / GOVERNANCE`: document safe smoke command defaults and destructive
   full-smoke approval requirement.
3. `LOW / DEPLOY_SAFETY`: add an `audit:kohee` retired-field drift guard.
4. `MEDIUM / FRONTEND_RENDERING`: continue admin review console Phase 2/3
   without API behavior changes.
5. `HOLD / HIGH`: physical manager D1/schema cleanup, reviewed CSV apply,
   resetCsv transaction redesign, and Phase 3/4 automation writes.

## Report

Risk / Lane / Commit or PR / Changed files / Changed functions / Tests / Remaining risks

- Risk: LOW
- Lane: GOVERNANCE / DEPLOY_SAFETY audit-only
- Commit or PR: Draft PR expected
- Changed files:
  - `docs/audits/2026-05-12-commercial-codebase-gap-audit.md`
- Changed functions: None
- Tests:
  - `npx.cmd prettier --write docs\audits\2026-05-12-commercial-codebase-gap-audit.md`
  - `npm.cmd run check:deploy-sync`
  - `npm.cmd run test:unit`
  - `npm.cmd run audit:kohee`
  - `git diff --check`
- Remaining risks:
  - This is an audit report only; actual code/tooling changes must be split
    into scoped PRs.
  - HIGH/HOLD areas remain blocked until explicit approval.
