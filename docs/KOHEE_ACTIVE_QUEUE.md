# KOHEE Active Queue

Last updated: 2026-05-11
Owner: ChatGPT orchestration baseline

Purpose: current work queue, blockers, merge order, and cleanup targets. Keep this file short and actionable.

Source split:

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term policy and invariants
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue and blockers
- `docs/CODEX_AUTOMATION_STATUS.md` = historical automation status/reference
- `docs/CODEX_WORKFLOW.md` = legacy Codex/local workflow reference unless updated

## Operating rules

- Use GitHub evidence only: PR URL, head SHA, changed files, checks, review threads, workflow results, issue state, merged state.
- Do not trust Codex self-report, local branch names, local commits, or `make_pr` metadata by itself.
- PRs are review/validation/change units, not chat progress reports or TODO notes.
- Use issues/ACTIVE_QUEUE for task tracking.
- LOW/MEDIUM safe work may run in parallel only when files, risk areas, and shared tests do not overlap.
- Merge remains sequential after checks and review-thread gates pass.
- Prefer native auto-merge for eligible safe PRs when available.
- Stop only for HIGH/HOLD, non-recoverable checks, unresolved blocking review, merge conflict, permission/tool errors, or explicit user interruption.

## Brevity rule

All records, docs, PR bodies, queue entries, scripts, and comments should be concise, readable, and action-oriented.

Do:

- write short sections with status, blocker, next action
- keep code small and focused
- prefer exact file/risk/decision lists
- move old details to history/reference docs

Do not:

- repeat the same policy across many docs
- write long narrative dumps in active queue
- create tiny sequential PRs for the same file
- use PRs as status chatter
- mix current queue state into long-term policy docs

## Current runtime health

- Production runtime is relatively stable.
- Public `/data` invariant remains: `status = 'approved' AND deleted_at IS NULL`.
- Auth/session/security has token hashing, CSRF, required `SESSION_SECRET`, rate limits, and audit scrubbing.
- CSV direct approved publishing is blocked by candidate staging.
- Main weakness is automation/control-plane maturity, not cafe runtime functionality.

## Required-check cleanup

Status:

- GitHub branch protection now requires native GitHub Actions checks: `pr-validate` and `verify`.
- This is correct.

Blocker:

- PR #95 still tries to add a custom commit status named `pr-validate`.
- That can recreate the head-SHA vs test-merge-SHA `pr-validate expected` problem.

Next action:

- In PR #95, remove custom commit status publishing:
  - remove `statuses: write`
  - remove `Publish required status context`
  - remove `github.rest.repos.createCommitStatus(...)`
  - keep native GitHub Actions check-runs only

Evidence:

- `main` currently has no custom `pr-validate` commit-status publisher.
- #95 introduces it, so #95 must be fixed before merge.

## Current open PR queue

### Independent / clean candidates

- PR #103 — structured dry-run worker logs
  - Files: `automation/github-app-worker/src/index.mjs`, `automation/github-app-worker/test/dry-run.test.mjs`
  - Status: checks success, no review threads seen
  - Risk: LOW/MEDIUM dry-run automation only
  - Action: merge candidate if still clean

- PR #105 — ops governance follow-up docs
  - Status: checks success, no review threads seen
  - Risk: LOW docs/governance
  - Action: merge candidate if still clean and not duplicating ACTIVE_QUEUE

### Sequential dependency queue

1. PR #100 — queue state machine
   - Blocker: unresolved review comments
   - Fix:
     - use `state: HOLD` + blocker/reason, not `HOLD_HIGH` / `HOLD_USER` as canonical states
     - restrict stale transition to queued-without-evidence cases
   - Action: fix first, then merge

2. PR #95 — command guard / validator
   - Risk: MEDIUM governance/tooling
   - Blockers:
     - remove custom `pr-validate` status publisher
     - coordinate with #101 on command-dispatch workflow
   - Action: fix #95 before merge

3. PR #101 — dispatch overwrite protection
   - Blocker: removes manual `@codex` trigger guidance while workflow does not auto-post `@codex`
   - Action: fold into #95 if practical; otherwise rebase/fix after #95

4. PR #99 — read-only maintenance audit
   - Blocker: overlaps #95 on `package.json`
   - Action: update/rebase/recheck after #95; keep strictly read-only

Correct sequence:

```text
#103 / #105 if still clean and independent
#100 fix -> merge
#95 fix custom status + coordinate #101
#95 merge after dispatch policy is correct
#101 close superseded or rebase/fix/merge after #95
#99 update/rebase/recheck -> merge
```

## Cleanup targets

P0:

- Fix #95 custom `pr-validate` status publisher.
- Fix #100 state names and stale semantics.
- Resolve #95/#101 command-dispatch overlap.
- Preserve manual `@codex` trigger guidance while preventing issue overwrite.
- Keep #99 read-only and recheck it after #95.

P1:

- Mark `CODEX_WORKFLOW.md` as legacy/local Codex reference and remove Codex-main wording.
- Remove volatile current-state lists from `KOHEE_MASTER_CONTEXT.md`; keep them in ACTIVE_QUEUE.
- Reduce `CODEX_AUTOMATION_STATUS.md` to historical/reference status and avoid repeating active policy.
- Improve maintenance audit with KOHEE_STATUS comment parsing.
- Add explicit ACTIVE_QUEUE/docs overlap detection to maintenance audit.
- Clean handler-internal legacy manager permissions without touching D1/schema.

HOLD/HIGH:

- D1/schema manager role CHECK removal
- resetCsv transaction/staging redesign
- evidence/category verification DB
- auth/session/security redesign
- public `/data` behavior changes
- CSV import/reset semantics
- production deploy workflows/secrets
- GitHub App production write enablement
- automatic branch deletion
- automatic issue close

## Reporting rule

For every future queue update, report only:

```text
Status / Blocker / Next action / Evidence
```

Do not add long background unless it changes the decision.
