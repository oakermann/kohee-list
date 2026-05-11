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

All operational records, docs, PR bodies, queue entries, scripts, and comments should be concise, readable, and action-oriented.

Do:

- write short sections with clear status, blocker, next action
- keep code small and focused
- prefer exact file/risk/decision lists over long explanations
- move old details to history/reference docs when no longer active

Do not:

- repeat the same policy across many docs
- write long narrative status dumps in active queue
- create many tiny PRs for sequential edits to the same file
- use PRs as status chatter
- mix current queue state into long-term policy docs

## Current runtime health

- Production runtime is relatively stable.
- Public `/data` invariant remains: `status = 'approved' AND deleted_at IS NULL`.
- Auth/session/security has token hashing, CSRF, required `SESSION_SECRET`, rate limits, and audit scrubbing.
- CSV direct approved publishing is blocked by candidate staging.
- Current main weakness is automation/control-plane maturity, not cafe runtime functionality.

## Current open PR queue

### Independent / can be handled separately

- PR #103 — structured dry-run worker logs
  - Files: `automation/github-app-worker/src/index.mjs`, `automation/github-app-worker/test/dry-run.test.mjs`
  - Status: checks seen passing, no review threads seen
  - Risk: LOW/MEDIUM dry-run automation only
  - Action: merge candidate if still clean

### Sequential dependency queue

1. PR #100 — queue state machine
   - Files: `docs/QUEUE_STATE_MACHINE.md`
   - Blocker: unresolved review comments
   - Fix before merge:
     - use `state: HOLD` + blocker/reason, not `HOLD_HIGH` / `HOLD_USER` as canonical states
     - restrict stale transition to queued-without-evidence cases
   - Action: fix first, then merge first

2. PR #95 — command guard / validator
   - Files: command dispatch workflow, PR validate workflow, `AGENTS.md`, `package.json`, validator script
   - Risk: MEDIUM governance/tooling
   - Action: integrate/coordinate with #101 before final merge

3. PR #101 — dispatch overwrite protection
   - Files: command dispatch workflow
   - Blocker: removes manual `@codex` trigger guidance while workflow does not auto-post `@codex`
   - Action: fold into #95 if practical; otherwise rebase/fix after #95

4. PR #99 — read-only maintenance audit
   - Files: maintenance audit workflow/script, `package.json`
   - Blocker: overlaps #95 on `package.json`
   - Action: update/rebase/recheck after #95; keep strictly read-only

Correct sequence:

```text
#103 if clean and independent
#100 fix -> merge
#95 + #101 integration decision
#95 merge after dispatch overwrite policy is correct
#101 close as superseded or rebase/fix/merge after #95
#99 update/rebase/recheck -> merge
```

## Cleanup targets

P0:

- Reflect PR #103 in active queue.
- Fix #100 state names and stale semantics.
- Resolve #95/#101 command-dispatch overlap.
- Preserve manual `@codex` trigger guidance while preventing command issue overwrite.
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

## Next reporting rule

For every future queue update, report only:

```text
Status / Blocker / Next action / Evidence
```

Do not add long background unless it changes the decision.
