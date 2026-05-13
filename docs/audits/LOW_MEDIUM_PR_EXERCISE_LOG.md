# Low/Medium PR Exercise Log

Status: completed baseline exercise loop
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

## Summary

Completed baseline exercises: 3

Observed decisions:
- Exercise 1: FIX_REQUIRED -> MERGE
- Exercise 2: MERGE
- Exercise 3: MERGE

Observed value:
- The exercise loop caught a real ledger evidence issue in Exercise 1.
- The FIX_REQUIRED path was used and resolved before merge.
- Subsequent LOW docs-only PRs completed through expected file checks, required checks, review-thread validation, and merge.

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

Status: COMPLETED
Candidate: Record Exercise 1 outcome and add Exercise 2 to the ledger.
Source: Low/medium PR exercise loop continuation.
Risk: LOW
Expected files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Actual changed files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Forbidden areas touched: no
PR URL: https://github.com/oakermann/kohee-list/pull/181
head SHA at final decision: `aafc1507125db825a4d42390c126891e398eecdb`
checks: PR Validate success; Validate / verify success
review threads: none
decision: MERGE
result: merged as `2330450b4af0f3d496bd5088a3048499a8b9d38e`
follow-up: run exercise 3.

### Exercise 3 — record second exercise result

Status: COMPLETED
Candidate: Record Exercise 2 outcome and add Exercise 3 to the ledger.
Source: Low/medium PR exercise loop continuation.
Risk: LOW
Expected files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Actual changed files:
- `docs/audits/LOW_MEDIUM_PR_EXERCISE_LOG.md`
Forbidden areas touched: no
PR URL: https://github.com/oakermann/kohee-list/pull/182
head SHA at final decision: `a8416df26feaffdf3a1cb83f8b0a5790cc347ced`
checks: PR Validate success; Validate / verify success
review threads: none
decision: MERGE
result: merged as `78342a6804bc3b7b84eeb121a5ef52ebad02030e`
follow-up: baseline loop complete; next recommended step is policy-as-code implementation planning or a second exercise loop with a different LOW/MEDIUM task type.
