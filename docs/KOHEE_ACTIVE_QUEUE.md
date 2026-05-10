# KOHEE Active Queue

Last updated: 2026-05-11
Status owner: ChatGPT orchestration baseline

This file is the active operational queue for ChatGPT-led KOHEE LIST work.

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term source of truth
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue, blockers, current PR order, operational risks, and next patch candidates

---

## 0. Current operating mode

KOHEE LIST is operating in:

- ChatGPT-main executor/orchestrator mode
- GitHub evidence-first verification mode
- GitHub Actions validation-gate mode
- Codex reviewer/PATCH_READY support mode
- parallel-by-default mode for safe LOW/MEDIUM work
- safe auto-merge preferred mode for eligible LOW/MEDIUM PRs

Trust actual GitHub evidence only: real PR URL, head SHA, changed files, checks, review threads, workflow results, issue state, and merged state.

Do not trust by itself: Codex Cloud self-report, `make_pr` metadata, local branch name, local commit claim, or task-local done message.

---

## 1. Current full-code review snapshot

Latest review scope:

- Worker/API route flow
- auth/session/security
- public `/data` exposure
- CSV import/reset/export
- frontend shared helpers
- GitHub automation/control-plane PRs
- current open PR merge dependencies

Judgment:

- Production app runtime is relatively stable.
- Main weakness is automation/control-plane maturity, not cafe runtime functionality.
- Current open automation PRs must be treated as a sequential dependency queue, not parallel merge candidates.

---

## 2. Production app code health

### Runtime routing

Flow:

```text
worker.js -> server/routes.js -> server/*.js handlers -> D1
```

Status:

- Worker routing is simple and acceptable.
- CORS origin checks run before route dispatch.
- `routes.js` wraps most operational/admin routes with `adminOnly`.

### Public exposure

Public `/data` invariant remains valid:

```sql
status = 'approved' AND deleted_at IS NULL
```

Status:

- Public cafe exposure is currently safe.
- Current automation PRs do not alter public `/data`.

### Auth/session/security

Status:

- Session token hashing, CSRF, required `SESSION_SECRET`, login/signup rate limit, and audit scrubbing exist.
- Runtime role exposure maps legacy manager to user/admin client roles.

Known debt:

- `shared.js` still includes legacy `manager` in `ROLES`.
- D1/schema manager removal remains HIGH/HOLD.
- Handler-internal manager permission cleanup remains P1 and must not be mixed with unrelated automation PRs.

### CSV/import/reset

Status:

- CSV `approved` input does not directly publish; it stages as candidate.
- Category/status whitelist exists.
- Review CSV export has formula-injection protection.

Known debt:

- `resetCsv` uses snapshot/manual rollback, not DB-level transaction/staging table design.
- Full resetCsv atomic redesign remains HIGH/HOLD.

### Frontend/shared helpers

Status:

- CSRF header handling and role label fallback are acceptable.
- `modalDescHtml()` returns escaped HTML string.

Known debt:

- Long-term DOM/textContent conversion can continue as P2.

---

## 3. Current open PR queue and corrected merge order

Open PRs reviewed:

1. PR #100 — `docs: add queue state machine`
2. PR #95 — `chore: add command guard`
3. PR #101 — `fix: prevent command dispatch issue overwrite`
4. PR #99 — `feat: add read-only maintenance audit`

Corrected sequence:

```text
#100 review-fix -> #100 merge
-> #95 + #101 integration decision
-> #95 merge after command-dispatch overwrite policy is correct
-> #101 close as superseded or rebase/fix/merge after #95
-> #99 update/rebase/recheck
-> #99 merge
```

Do not use the older simplistic sequence `#100 -> #95 -> #101 -> #99` without required review fixes and overlap handling.

---

## 4. PR-specific findings

### PR #100 — queue state machine

Files:

- `docs/QUEUE_STATE_MACHINE.md`

Status:

- Independent docs-only PR.
- Checks were seen passing, but unresolved review threads exist.

Must fix before merge:

- Do not define `HOLD_HIGH` and `HOLD_USER` as canonical states.
- Use canonical `state: HOLD` plus blocker/reason values such as `HOLD_HIGH_RISK` and `HOLD_USER_APPROVAL`.
- Restrict stale transition wording.
- Stale should apply only to queued/no-evidence cases, not any inactive abandoned state.

Correct stale semantics:

```text
QUEUED + no KOHEE_STATUS + no PR activity + no acknowledgement evidence
-> STALE_CANDIDATE / STALE
```

Priority:

- P0 support doc.
- Fix first, then merge first.

### PR #95 — command guard / validator

Files:

- `.github/workflows/kohee-command-dispatch.yml`
- `.github/workflows/pr-validate.yml`
- `AGENTS.md`
- `package.json`
- `scripts/validate-kohee-command.mjs`

Status:

- Core P0 guardrail.
- Direction is correct.
- It changes workflow and package scripts, so treat as MEDIUM governance/tooling.

Good parts:

- adds command validator
- adds merge-order metadata
- detects same-file/shared-test/HIGH-HOLD parallel risks
- attempts to read KOHEE_STATUS comments for terminal state
- adds required status context work in PR validation

Risk:

- Overlaps #101 on `.github/workflows/kohee-command-dispatch.yml`.
- Overlaps #99 on `package.json`.
- Changes `.github/workflows/pr-validate.yml`, so the next PR after #95 must prove required checks still run correctly.

Preferred action:

- Fold #101 create-only overwrite protection into #95 if practical.
- Otherwise merge #95 first, then rebase/fix #101.

### PR #101 — dispatch overwrite protection

Files:

- `.github/workflows/kohee-command-dispatch.yml`

Status:

- Goal is correct, current implementation is incomplete.

Good part:

- moves toward create-only command issues instead of updating unrelated queued issues.

Blocking issue:

- Removes manual `@codex` trigger guidance even though the workflow does not automatically post an `@codex` comment.
- This can create command issues that remain `QUEUED` with no clear execution step.

Required fix:

- Keep create-only/no-overwrite behavior.
- Restore manual `@codex` trigger guidance in issue body and workflow summary.
- Preserve PR evidence guard.

Preferred action:

- Fold into #95, or rebase/fix after #95.
- Do not merge standalone in current form.

### PR #99 — read-only maintenance audit

Files:

- `.github/workflows/kohee-maintenance-audit.yml`
- `package.json`
- `scripts/kohee-maintenance-audit.mjs`

Status:

- Direction is correct.
- Must be processed after #95 because both touch `package.json`.

Good parts:

- workflow permissions are read-only.
- no branch deletion
- no issue close
- no auto-merge
- no deploy
- summary output focused
- filters PRs from issue audit using `issue.pull_request`

Gaps:

- ACTIVE_QUEUE mismatch detection is still shallow.
- docs/automation overlap detection is still shallow.
- KOHEE_STATUS comment parsing is weaker than #95 validator logic.
- branch HOLD pattern matching may over-classify CSV/reset/auth names as HOLD.

Required before merge:

- Rebase/update after #95.
- Rerun checks after package script changes settle.
- Confirm read-only behavior remains true.

Good follow-up:

- Add comment-based KOHEE_STATUS parsing to maintenance audit.

---

## 5. Current P0 priority order

### P0-A — Fix and merge PR #100

Required changes:

- replace `HOLD_HIGH`/`HOLD_USER` state names with `HOLD + blocker`
- narrow stale transition semantics
- resolve review threads

### P0-B — Consolidate command dispatch guard path

Reason:

- #95 and #101 overlap on command dispatch workflow.
- command overwrite protection is required for safe parallel/touchless operation.

Preferred outcome:

- #95 absorbs #101 logic.
- #101 closes as superseded.

Acceptable alternative:

- #95 merges first.
- #101 rebases and restores manual trigger guidance before merge.

### P0-C — Merge PR #95 after review and recheck

Must verify after merge:

- required `pr-validate` status still appears on subsequent PRs
- command dispatch validation does not block terminal KOHEE_STATUS comment cases incorrectly

### P0-D — Rebase/recheck/merge PR #99

Must verify:

- read-only permissions
- no deletion/close/write/deploy behavior
- package script conflict resolved

---

## 6. P1 backlog from full-code review

### P1 — Handler-internal manager cleanup

Reason:

- route boundary is admin-only, but handler internals still allow `manager` in some places.
- Avoid future reuse confusion.

Likely files:

- `server/cafes.js`
- `server/submissions.js`
- `server/errorReports.js`
- tests

Do not include:

- D1/schema role removal
- auth/session redesign

### P1 — Maintenance audit status parsing improvement

Reason:

- audit should read KOHEE_STATUS comments, not only issue bodies.

### P1 — Maintenance audit docs/ACTIVE_QUEUE mismatch detection

Reason:

- current audit direction mentions mismatch detection, but implementation should become more explicit.

---

## 7. HOLD / HIGH

Do not auto-change without explicit user approval:

- D1/schema role CHECK manager removal
- resetCsv transaction/staging redesign
- evidence/category verification DB
- auth/session/security redesign
- public `/data` behavior
- CSV import/reset semantics
- production deploy workflows/secrets
- GitHub App production write enablement
- automatic branch deletion
- automatic issue close

---

## 8. Execution philosophy

Current KOHEE priority is not rapid feature expansion.

Current priority is:

- operational stabilization
- orchestration hardening
- source-of-truth consolidation
- safe automation layering
- future parallel execution safety
- operational observability
- cleanup/efficiency automation
- touchless LOW/MEDIUM execution
- safe native auto-merge usage
- proper PR hygiene

The current bottleneck is operational structure and automation control-plane maturity, not cafe runtime functionality.
