# Low/Medium PR Exercise Log

Status: active exercise ledger
Risk: LOW docs/audit

Purpose: record real LOW/MEDIUM PR exercises that prove the automation platform can process PRs through dry-run selection, GitHub evidence validation, checks, and MERGE/FIX/HOLD/NEXT decisions before stronger automation is considered.

Rules:
- Exercises must use GitHub evidence, not Codex self-report.
- Exercises must remain LOW/MEDIUM unless explicitly approved.
- Exercises must not touch product code, deployment settings, credentials, D1/schema, auth/session, CSV import/reset, public `/data`, dependency/package/lockfile/install-script behavior, auto-merge, direct merge bot behavior, issue close automation, branch deletion automation, or unattended loops.
- Each exercise must have expected files, actual changed files, checks, review threads, decision, and result.

## Ledger template

| Field | Required value |
| --- | --- |
| Exercise number | 1, 2, or 3+ |
| Candidate | Selected task name |
| Source | Active queue / owner request / PR |
| Risk | LOW or MEDIUM |
| Expected files | Expected file list |
| Actual changed files | GitHub changed file list |
| Forbidden areas touched | yes/no |
| PR URL | GitHub PR URL |
| head SHA | Head SHA at decision time |
| checks | Required check result |
| review threads | Resolved/unresolved/outdated summary |
| decision | MERGE, FIX, HOLD, or NEXT |
| result | merged, fixed, held, or skipped |
| follow-up | next action or none |

## Exercise records

### Exercise 1 — exercise ledger seed

Status: COMPLETED
Candidate: Add a LOW docs-only exercise ledger.
Source: Phase 6C post-gate option: low/medium PR exercise loop.
Risk: LOW
Expected files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Actual changed files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Forbidden areas touched: no
PR URL: https://github.com/oakermann/kohee-list/pull/180
head SHA at final decision: `c5f72ecb2c1e97e3c190a49fb4d24f52e931a86d`
checks: PR Validate success; Validate / verify success
review threads: one FIX_REQUIRED thread opened, fix applied, thread resolved
decision: FIX_REQUIRED -> MERGE
result: merged as `ca1c993fcf9a6835c3e262d00cfaab8b8bf44929`
follow-up: run exercise 2.

### Exercise 2 — record exercise result flow

Status: IN_PROGRESS
Candidate: Record Exercise 1 outcome and add Exercise 2 to the ledger.
Source: Low/medium PR exercise loop continuation.
Risk: LOW
Expected files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Actual changed files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Forbidden areas touched: no
PR URL: pending
head SHA at final decision: pending
checks: pending
review threads: pending
decision: pending
result: pending
follow-up: run exercise 3 after this PR is closed.
