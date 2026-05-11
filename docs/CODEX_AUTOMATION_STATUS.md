# KOHEE Automation Status

Last verified: 2026-05-11
Status: historical/reference

This document is no longer the active queue or primary automation policy.

Use these sources first:

```text
KOHEE_MASTER_CONTEXT.md = long-term policy and invariants
KOHEE_ACTIVE_QUEUE.md = current state, blockers, next actions
DESIGN_REVIEW_LOG.md = design decisions
WORK_SESSION_LOG.md = GitHub execution evidence
LOCAL_CODEX_AUDIT_LOG.md = local Codex evidence
```

If this file conflicts with `KOHEE_MASTER_CONTEXT.md` or `KOHEE_ACTIVE_QUEUE.md`, follow those newer files.

## Current baseline summary

- ChatGPT GitHub connector is the main executor/orchestrator for normal KOHEE LIST work.
- GitHub Actions is the validation and deploy gate.
- Codex is reviewer, analysis, and PATCH_READY support.
- Codex self-reports are not final evidence.
- GitHub evidence wins: real PR URL, head SHA, changed files, checks, review threads, workflow result, issue state.
- Issue `@codex` triggers are support paths, not trusted PR publishing evidence unless an actual PR URL exists.
- GitHub App + Cloudflare Worker automation remains staged by phases.

## Current phase references

- Phase 2 dry-run setup and endpoint: `docs/GITHUB_APP_WORKER_PHASE2_DRY_RUN.md`
- Phase 3 proposed issue-comment bridge: `docs/GITHUB_APP_WORKER_PHASE3_PLAN.md`
- Queue state language: `docs/QUEUE_STATE_MACHINE.md`
- Document cleanup plan: `docs/DOCUMENT_ROLE_CLEANUP_PLAN.md`

## Reliable paths

### ChatGPT GitHub connector

Use for:

- branch/file/PR/check/review-thread/merge operations
- docs and queue updates
- safe LOW/MEDIUM GitHub edits
- PR evidence verification

### GitHub Actions

Use as the validation/deploy gate:

- `PR Validate`
- `Validate`
- unit tests
- `audit:kohee`
- evidence checks where configured

### Codex

Use as support only:

- PR review
- failure analysis
- PATCH_READY proposals
- local authenticated work when explicitly routed to LOCAL_TRACK

Codex must not claim `PR_OPEN` without an actual GitHub PR URL.

## Known limitations

- ChatGPT connector may be unable to post `@codex` trigger comments directly.
- Issue-triggered Codex may not publish actual PRs from every environment.
- Direct Codex task output must be checked against GitHub evidence.
- Phase 3 comment writes and Phase 4 auto-merge automation are not enabled unless a later approved PR implements them.

## High-risk boundaries

Keep these user-approved/HOLD by default:

- D1 schema and migrations
- auth, sessions, secrets, roles, permissions
- public `/data` or public API behavior
- CSV import/reset and reviewed CSV apply behavior
- destructive data behavior
- production deploy workflow/secrets
- GitHub App write enablement beyond approved phase scope
- issue-close automation
- broad auto-merge automation
- physical legacy manager D1/schema cleanup
- resetCsv staging/transaction redesign
- evidence DB design/migration

## Historical baseline PRs

Key automation/governance milestones:

- #38 command dispatch workflow
- #40 presets and manual trigger guidance
- #42 PR evidence verifier
- #44 status watchdog
- #52 watchdog regression tests
- #79 scheduled fan-out removal
- #81 legacy manager runtime/admin removal
- #83 user-facing operator redaction
- #85 GitHub App Worker Phase 2 preparation
- #88 policy guard coverage
- #108 structured dry-run logs
- #109 separated audit logs
- #110 dry-run readiness record
- #111 dry-run secret/bot login alignment
- #112 actual dry-run endpoint update
- #113 dry-run deployment evidence
- #114 execution track routing hints
- #115 memory backlog sync
- #116 mobile automation planning docs

## Current operating note

Do not use this file as a live backlog. Use `docs/KOHEE_ACTIVE_QUEUE.md` for current work.