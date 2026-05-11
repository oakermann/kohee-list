# KOHEE Active Queue

Last updated: 2026-05-11
Owner: ChatGPT orchestration baseline

Purpose: current work queue, blockers, merge order, and cleanup targets. Keep this file short and actionable.

Source split:

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term policy and invariants
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue and blockers
- `docs/LOCAL_CODEX_RUNBOOK.md` = local Codex start/read/report rules
- `docs/audits/DESIGN_REVIEW_LOG.md` = design decisions and rationale
- `docs/audits/WORK_SESSION_LOG.md` = ChatGPT GitHub execution evidence
- `docs/audits/LOCAL_CODEX_AUDIT_LOG.md` = local Codex audits, fixes, and local verification
- `docs/CODEX_AUTOMATION_STATUS.md` = historical automation status/reference
- `docs/CODEX_WORKFLOW.md` = legacy Codex/local workflow reference unless updated

## Routing hint

Use tracks as routing hints, not blockers:

- `MOBILE_TRACK`: ChatGPT/GitHub connector can plan, review, update docs/queue, inspect PRs/checks, and handle safe GitHub edits.
- `LOCAL_TRACK`: local Codex should execute because the task needs local tests, `gh`, `wrangler`, Cloudflare, webhook checks, secrets/private-key handling, or deeper local debugging.

For LOCAL_TRACK, local Codex should read `docs/LOCAL_CODEX_RUNBOOK.md` first and then follow the first ready local task in this queue.

## Operating rules

- Use GitHub evidence only: PR URL, head SHA, changed files, checks, review threads, workflow results, issue state, merged state.
- Do not trust Codex self-report, local branch names, local commits, or `make_pr` metadata by itself.
- PRs are review/validation/change units, not chat progress reports or TODO notes.
- Use issues/ACTIVE_QUEUE for task tracking.
- LOW/MEDIUM safe work may run in parallel only when files, risk areas, and shared tests do not overlap.
- Merge remains sequential after checks and review-thread gates pass.
- Prefer native auto-merge for eligible safe PRs when available.
- Stop only for HIGH/HOLD, non-recoverable checks, unresolved blocking review, merge conflict, permission/tool errors, or explicit user interruption.
- If a LOW/MEDIUM problem occurs, investigate first using GitHub evidence, repo code, workflow logs, review threads, and relevant official docs before asking the user.

## Current runtime health

- Production runtime is relatively stable.
- Public `/data` invariant remains: `status = 'approved' AND deleted_at IS NULL`.
- Auth/session/security has token hashing, CSRF, required `SESSION_SECRET`, rate limits, and audit scrubbing.
- CSV direct approved publishing is blocked by candidate staging.
- Current main weaknesses: automation/control-plane maturity, legacy manager cleanup, and admin review UX.

## Current blockers

### PR #118 legacy manager/pick removal

Track: `LOCAL_TRACK`
Status: `HOLD_LOCAL_REQUIRED`
Blocker: `scripts/test-unit.mjs` still has legacy direct-handler tests that expect manager-role handler calls to return 200.
Next action: use `docs/LOCAL_CODEX_RUNBOOK.md`, rework `scripts/test-unit.mjs` expectations around manager direct-handler calls, preserve route-level manager denial, then rerun full local verification.
Evidence: `https://github.com/oakermann/kohee-list/pull/118`

### Phase 2 webhook delivery

Track: `LOCAL_TRACK`
Status: deployed dry-run Worker; delivery verification pending.
Blocker: GitHub App webhook URL must use the actual account endpoint if not already updated, then a harmless event must be delivered.
Next action: trigger issue/comment event, confirm GitHub App delivery 200, and confirm Worker dry-run decision log.
Evidence: health passed at `https://kohee-github-app-worker-dry-run.gabefinder.workers.dev/health`; no production KOHEE deploy was run.

## Cleanup targets

P0/P1:

- Finish PR #118 locally: manager direct-handler test rewrite, manager_pick removal verification, no D1 migration.
- Confirm Phase 2 webhook delivery.
- Implement Phase 3 safe issue-comment bridge only after Phase 2 delivery evidence is stable.
- Rebuild command validator without custom commit statuses.
- Rebuild command dispatch create-only/no-overwrite behavior while preserving manual `@codex` guidance.
- Implement read-only maintenance audit.
- Continue admin review console Phase 2/3/4.
- Add submissions review CSV export Phase 2.
- Defer all-review export until status-specific/submission exports are stable.
- Defer admin UI CSV button wiring until review console/export flows are stable.
- Strengthen `audit:kohee` only from useful observed WARNs; avoid noisy blocking rules.
- Keep broader LOW-only auto-merge automation deferred until the automation/check/review loop is stable over more PRs; existing manual use of native auto-merge for verified safe PRs remains allowed.
- Run document role cleanup following `docs/DOCUMENT_ROLE_CLEANUP_PLAN.md`.

HOLD/HIGH:

- D1/schema manager role CHECK removal
- manager_pick DB column removal
- resetCsv transaction/staging redesign
- evidence/category verification DB
- auth/session/security redesign
- public `/data` behavior changes
- CSV import/reset semantics
- production deploy workflows/secrets
- GitHub App production write enablement
- automatic branch deletion
- automatic issue close

Always preserve:

- Public/internal data separation.
- Public `/data` only approved + non-deleted.
- HIGH server/data/auth/D1/deploy work requires PR + user approval.

## Next reporting rule

For every future queue update, report only:

```text
Status / Blocker / Next action / Evidence
```

Do not add long background unless it changes the decision.
