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

Status: IN_PROGRESS
Candidate: Add a LOW docs-only exercise ledger.
Source: Phase 6C post-gate option: low/medium PR exercise loop.
Risk: LOW
Expected files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Actual changed files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Forbidden areas touched: no
PR URL: https://github.com/oakermann/kohee-list/pull/180
head SHA: pending final validation
checks: pending final validation
review threads: FIX_REQUIRED thread addressed by adding actual changed files
 decision: pending final validation
result: pending
follow-up: run exercise 2 after this PR is closed.
