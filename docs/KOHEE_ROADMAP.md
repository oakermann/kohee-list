# KOHEE Roadmap

Last updated: 2026-05-19

Every READY task below must be executable from this document alone. If scope is
unclear, return HOLD instead of editing.

### KOH-DOC-001: OAP-ready product contract structure
- Priority: P0
- Status: READY
- Risk: LOW
- Lane: docs
- Goal: Make KOHEE readable by external OAP/agents without chat memory.
- Allowed files: `AGENTS.md`, `README.md`, `kohee.contract.json`, `docs/**`, `scripts/audit-kohee.mjs` only for contract-schema audit compatibility.
- Forbidden files: `server/**`, `assets/**`, `.pages-deploy/**`, `migrations/**`, `schema.sql`, `worker.js`, `.github/workflows/**`, `package.json`.
- Acceptance criteria: Master context is an index; constitution, product rules, data policy, D1/deploy runbook, roadmap, and execution log exist; contract is product-focused and machine-readable; no OAP platform artifacts return.
- Required validation: `npm run check:deploy-sync`; `npm run test:unit`; `npm run audit:kohee`; `npm run verify:release`; `git diff --check`; `node scripts/detect-changed-areas.mjs --working-tree`.
- Merge gate: MERGE only when validation is green, changed files stay in allowed scope, no product runtime files changed, and review threads are resolved. FIX on failed checks or requested changes. HOLD on protected-area edits. NEXT after merge is the next READY roadmap task.
- Notes: This is docs/contract only.

### KOH-FE-001: admin review console Phase 1
- Priority: P1
- Status: READY
- Risk: MEDIUM
- Lane: frontend
- Goal: Improve admin review console clarity without changing API behavior.
- Allowed files: `admin.html`, `.pages-deploy/admin.html`, `assets/admin.js`, `.pages-deploy/assets/admin.js`, `assets/admin.css`, `.pages-deploy/assets/admin.css`, `scripts/test-unit.mjs` if tests are required.
- Forbidden files: `server/**`, `migrations/**`, `schema.sql`, `worker.js`, CSV import/reset behavior, public `/data` behavior, auth/session/security behavior, deploy config.
- Acceptance criteria: Review UI is more scannable; candidate/hold/approved states remain separated; no new public exposure path; no role expansion.
- Required validation: `npm run check:deploy-sync`; `npm run test:unit`; `npm run audit:kohee`; `npm run verify:release`; `git diff --check`; browser/manual smoke if UI changed.
- Merge gate: MERGE when checks pass and UI behavior is verified. FIX on rendering/test failures. HOLD if API/runtime behavior is needed. NEXT to test coverage hardening.
- Notes: Keep Korean UI copy short and neutral.

### KOH-CSV-001: submissions CSV export Phase 2
- Priority: P1
- Status: BLOCKED
- Risk: HIGH
- Lane: csv
- Goal: Design or implement safer submissions/review CSV export improvements.
- Allowed files: Audit/design docs only until separately scoped.
- Forbidden files: `server/csv.js`, `server/cafes.js`, `server/submissions.js`, `assets/admin.js`, `.pages-deploy/**`, `migrations/**`, `schema.sql`, `worker.js` unless explicitly approved.
- Acceptance criteria: Scope separates export-only behavior from import/reset/apply behavior; reviewed CSV cannot publish cafes automatically.
- Required validation: Docs-only validation plus `npm run audit:kohee`.
- Merge gate: HOLD until user approves exact CSV behavior scope. FIX if the task attempts import/reset or public publish behavior. NEXT can prepare a design-only PR.
- Notes: CSV import/reset remains HIGH/HOLD.

### KOH-TEST-001: public/internal data contract tests
- Priority: P1
- Status: READY
- Risk: MEDIUM
- Lane: test
- Goal: Add focused tests that public data never exposes internal fields and only exposes approved non-deleted cafes.
- Allowed files: `scripts/test-unit.mjs`, `scripts/audit-kohee.mjs`, docs explaining tests.
- Forbidden files: `server/**`, `assets/**`, `.pages-deploy/**`, `migrations/**`, `schema.sql`, `worker.js`, production data.
- Acceptance criteria: Tests cover candidate, hidden, rejected, deleted, and internal fields; product behavior remains unchanged.
- Required validation: `npm run test:unit`; `npm run audit:kohee`; `npm run verify:release`; `git diff --check`.
- Merge gate: MERGE when tests pass and no runtime files changed. FIX on test failure. HOLD if runtime behavior must change. NEXT to smoke tests.
- Notes: Test-only PR; do not refactor handlers.

### KOH-TEST-002: lightweight browser smoke tests
- Priority: P2
- Status: READY
- Risk: MEDIUM
- Lane: test
- Goal: Add lightweight browser smoke coverage for critical public/admin surfaces.
- Allowed files: `scripts/**`, docs describing smoke checks.
- Forbidden files: `server/**`, `assets/**`, `.pages-deploy/**`, `.github/workflows/**`, `migrations/**`, `schema.sql`, `worker.js`, deploy config.
- Acceptance criteria: Smoke is read-only, deterministic where possible, and does not require secrets for local dry checks.
- Required validation: `npm run test:unit`; `npm run verify:release`; `git diff --check`.
- Merge gate: MERGE when smoke tests pass locally and do not write production. FIX on flake or environment coupling. HOLD if workflow/deploy changes are needed. NEXT to scheduled smoke tuning if separately approved.
- Notes: Do not change scheduled workflow in this task.

### KOH-AUTH-001: manager role cleanup where safe
- Priority: P2
- Status: BLOCKED
- Risk: HIGH
- Lane: auth
- Goal: Reduce legacy manager compatibility safely.
- Allowed files: Audit/design docs only until explicitly scoped.
- Forbidden files: `server/auth.js`, `server/security.js`, `server/shared.js`, `server/users.js`, `server/routes.js`, `schema.sql`, `migrations/**`, UI role behavior.
- Acceptance criteria: Separate runtime role cleanup from schema migration; no manager behavior expansion.
- Required validation: `npm run audit:kohee`; `git diff --check`.
- Merge gate: HOLD until exact runtime/schema scope is approved. FIX if role behavior changes without approval. NEXT can prepare a design audit.
- Notes: Target role model remains admin/user.

### KOH-CSV-002: resetCsv atomicity audit
- Priority: P2
- Status: READY
- Risk: LOW
- Lane: audit
- Goal: Audit resetCsv atomicity risks without changing behavior.
- Allowed files: `docs/**`.
- Forbidden files: `server/csv.js`, `server/cafes.js`, `migrations/**`, `schema.sql`, `worker.js`, deploy config.
- Acceptance criteria: Document current reset flow, failure modes, rollback needs, and HIGH/HOLD implementation scope.
- Required validation: `npm run audit:kohee`; `git diff --check`.
- Merge gate: MERGE for audit-only docs. FIX if findings are unsupported. HOLD if implementation is attempted. NEXT to scoped implementation only after approval.
- Notes: Do not change CSV import/reset semantics.

### KOH-D1-001: evidence DB design
- Priority: P3
- Status: HOLD
- Risk: HIGH
- Lane: d1
- Goal: Design cafe evidence/confidence storage.
- Allowed files: None until approved; design docs only after explicit approval.
- Forbidden files: `migrations/**`, `schema.sql`, `server/**`, `worker.js`, production D1.
- Acceptance criteria: Requires product decision, privacy review, schema plan, backup plan, and migration plan.
- Required validation: HOLD; no implementation validation until approved.
- Merge gate: HOLD for any implementation. NEXT only after user approves design scope.
- Notes: Evidence/confidence remains internal.

### KOH-CSV-003: all-review export
- Priority: P3
- Status: DEFERRED
- Risk: HIGH
- Lane: csv
- Goal: Export all review states safely.
- Allowed files: None until scope is approved.
- Forbidden files: `server/**`, `assets/**`, `.pages-deploy/**`, `migrations/**`, `schema.sql`, `worker.js`.
- Acceptance criteria: Must avoid mixing internal and public data in a way that causes accidental publish.
- Required validation: HOLD until scoped.
- Merge gate: HOLD for implementation. NEXT can prepare requirements after approval.
- Notes: Deferred because data leak and publish confusion risks are high.

### KOH-CSV-004: admin CSV button wiring
- Priority: P3
- Status: DEFERRED
- Risk: HIGH
- Lane: csv
- Goal: Wire admin UI buttons for CSV workflows after policies stabilize.
- Allowed files: None until stable CSV policy and explicit scope exist.
- Forbidden files: `assets/admin.js`, `.pages-deploy/assets/admin.js`, `admin.html`, `.pages-deploy/admin.html`, `server/**`, `migrations/**`, `schema.sql`.
- Acceptance criteria: Must not expose import/reset/apply paths casually; must preserve admin approval gates.
- Required validation: HOLD until scoped.
- Merge gate: HOLD for implementation. NEXT only after CSV export/import policy is approved.
- Notes: UI wiring before stable policy is too risky.
