# KOHEE Execution Log

Concise history for new agents. SHAs are recorded only when known here.

## 2026-05-19

- Date: 2026-05-19
- Change: PR #200 Remove OAP platform artifacts.
- Files/areas: OAP docs/scripts/workflows removed; product-only scheduled smoke workflow retained/restored.
- Validation: `check:deploy-sync`, `test:unit`, `audit:kohee`, `verify:release`, `git diff --check`, `detect-changed-areas`.
- Result: MERGED. Product runtime files untouched.
- Follow-up: Build OAP-ready product docs/contract.
- SHA: not recorded in this document.

## Product Safety Milestones

- Date: 2026-05
- Change: Candidate/public separation established.
- Files/areas: public data and cafe lifecycle.
- Validation: product tests and audit checks.
- Result: Public data requires approved non-deleted cafes.
- Follow-up: Add stronger public/internal data contract tests.
- SHA: not recorded in this document.

- Date: 2026-05
- Change: Admin approval flow preserved.
- Files/areas: cafe review lifecycle.
- Validation: product tests and audit checks.
- Result: Submission/review acceptance does not equal public approval.
- Follow-up: Improve admin review console UX.
- SHA: not recorded in this document.

- Date: 2026-05
- Change: Candidate hold workflow preserved.
- Files/areas: hidden/hold lifecycle.
- Validation: product tests and audit checks.
- Result: Hold rows remain non-public.
- Follow-up: Audit hold CSV review flows before implementation.
- SHA: not recorded in this document.

- Date: 2026-05
- Change: CSV direct approved publishing blocked.
- Files/areas: CSV import/reset and lifecycle policy.
- Validation: `audit:kohee`.
- Result: CSV approved stages as candidate or requires explicit admin approval.
- Follow-up: Keep reviewed CSV apply workflow HOLD until approved.
- SHA: not recorded in this document.

- Date: 2026-05
- Change: Admin rendering/XSS cleanup.
- Files/areas: frontend rendering.
- Validation: product tests and review.
- Result: Safer DOM rendering paths.
- Follow-up: Add lightweight browser smoke tests.
- SHA: not recorded in this document.

- Date: 2026-05
- Change: Share button Naver map fix.
- Files/areas: frontend share/map behavior.
- Validation: product checks.
- Result: Share/map behavior corrected.
- Follow-up: Keep browser smoke coverage lightweight.
- SHA: not recorded in this document.

- Date: 2026-05
- Change: CSS format check addition.
- Files/areas: formatting/tooling.
- Validation: release verification.
- Result: Formatting coverage improved.
- Follow-up: Keep tooling focused on product safety.
- SHA: not recorded in this document.
