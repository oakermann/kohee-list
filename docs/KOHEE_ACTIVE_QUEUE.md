# KOHEE Active Queue

Last updated: 2026-05-11
Status owner: ChatGPT orchestration baseline

This file is the active operational queue for ChatGPT-led KOHEE LIST work.

Use this file as the current working overlay on top of `docs/KOHEE_MASTER_CONTEXT.md`.

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term source of truth
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue, blockers, next patch candidates, operational risks, and orchestration status

---

# 0. Current operating mode

KOHEE LIST is currently operating in:

- ChatGPT-main executor/orchestrator mode
- GitHub evidence-first verification mode
- GitHub Actions validation-gate mode
- Codex reviewer/PATCH_READY support mode
- parallel-by-default mode for safe LOW/MEDIUM work
- safe auto-merge preferred mode for eligible LOW/MEDIUM PRs

Trust actual GitHub evidence:

- real PR URL
- head SHA
- changed files
- checks
- review threads
- workflow results
- issue state
- merged state

Do not trust by itself:

- Codex Cloud self-report
- `make_pr` metadata
- local branch name
- local commit claim
- task-local done message

---

# 1. Proper PR usage policy

A pull request is not a chat progress report.

Correct PR purposes:

- reviewable code/docs change unit
- validation/checks unit
- audit trail for what changed and why
- branch protection gate
- rollback/reference point
- merge unit for one coherent scope

Incorrect PR usage:

- opening a PR only to say work started
- creating many tiny PRs for sequential edits to the same file when one coherent PR is enough
- using PRs as TODO notes instead of issues or ACTIVE_QUEUE entries
- using PRs as unresolved status reports when no file change is ready
- leaving PRs open as reminders after the actual work moved elsewhere
- creating parallel PRs that touch the same file or the same shared test path

Operational rule:

- Use issues/ACTIVE_QUEUE for task tracking.
- Use PRs only when there is a concrete repo change to validate and merge.
- Use auto-merge for eligible safe LOW/MEDIUM PRs.
- Use direct merge only when auto-merge is not applicable and GitHub evidence confirms the PR is clean and safe.
- Do not create a new PR for every minor queue wording change if the changes are part of the same active batch; amend/update the current batch PR instead.
- After merge, stale branch cleanup must be tracked by maintenance audit.

---

# 2. Current open PR queue and merge order

Current open PRs when this queue was refreshed:

1. PR #100 — `docs: add queue state machine`
   - Files: `docs/QUEUE_STATE_MACHINE.md`
   - Risk: LOW / docs-only
   - Priority: P0 support doc
   - Merge order: first
   - Reason: independent and safest; establishes canonical state names before automation code relies on them.

2. PR #95 — `chore: add command guard`
   - Files: `.github/workflows/kohee-command-dispatch.yml`, `.github/workflows/pr-validate.yml`, `AGENTS.md`, `package.json`, `scripts/validate-kohee-command.mjs`
   - Risk: MEDIUM governance/tooling because it touches validation workflow and command dispatch
   - Priority: P0 core guardrail
   - Merge order: second, after #100
   - Reason: enforces parallel lane/command validation and affects future PR validation behavior.

3. PR #101 — `fix: prevent command dispatch issue overwrite`
   - Files: `.github/workflows/kohee-command-dispatch.yml`
   - Risk: MEDIUM governance/tooling
   - Priority: P0 command isolation
   - Merge order: after #95, or fold/rebase against #95 if overlap is significant
   - Reason: overlaps #95 on command dispatch workflow, so it must not merge independently before #95 impact is known.

4. PR #99 — `feat: add read-only maintenance audit`
   - Files: `.github/workflows/kohee-maintenance-audit.yml`, `package.json`, `scripts/kohee-maintenance-audit.mjs`
   - Risk: LOW/MEDIUM governance/tooling, read-only intended
   - Priority: P0/P1 after command guard
   - Merge order: after #95 because both touch `package.json`
   - Reason: should rebase/update after #95 and rerun checks to avoid package script conflict.

Current recommended sequence:

```text
#100 -> #95 -> #101 -> update/recheck #99 -> #99
```

Current parallel rule applied:

- #100 is independent and can merge first.
- #95 and #101 overlap on `.github/workflows/kohee-command-dispatch.yml`; do not merge in parallel.
- #95 and #99 overlap on `package.json`; do not merge in parallel without rebase/recheck.
- #99 must remain read-only: no branch deletion, no issue close, no auto-merge, no deploy, no runtime behavior change.

---

# 3. Safe auto-merge activation

State: P0 operational efficiency target

Goal:

- reduce user touches before GitHub App Worker Phase 3+ is available.
- let GitHub wait for required checks and merge eligible safe PRs automatically.

Default flow for eligible LOW/MEDIUM PRs:

1. create PR
2. verify changed files and risk lane
3. deny HIGH/HOLD paths and behaviors
4. verify no unresolved review thread at the time auto-merge is enabled
5. enable GitHub native auto-merge if available and allowed
6. let GitHub wait for required checks
7. ChatGPT verifies final merged state or reports precise blocker

Eligible examples:

- docs-only
- governance-only
- audit-only
- isolated automation tooling without write enablement
- isolated frontend copy/wording with no permission or data behavior

Auto-merge is not allowed for:

- D1/schema/migration
- auth/session/security
- public `/data` behavior
- CSV import/reset semantics
- deploy workflows/secrets
- GitHub App production write enablement
- destructive data behavior
- automatic branch deletion
- issue-close automation
- PRs with unresolved review threads
- PRs with unclear changed files or broad scope

If auto-merge enablement fails:

- report the exact blocker
- do not present the work as completed
- fall back to manual merge only if GitHub evidence confirms it is safe and rules allow it

---

# 4. Current P0 queue

## P0-1 — ChatGPT-main stabilization

State: mostly completed / maintain

Remaining:

- prevent regression to Codex-main assumptions
- keep orchestration rules synchronized
- keep ChatGPT execution reports evidence-based

## P0-2 — Master source-of-truth

State: completed / maintain

Canonical file:

- `docs/KOHEE_MASTER_CONTEXT.md`

Operational overlay:

- `docs/KOHEE_ACTIVE_QUEUE.md`

## P0-3 — Parallel lane enforcement

State: active implementation through PR #95

Primary PR:

- PR #95

Expected responsibilities:

- deny same-file overlap
- deny `scripts/test-unit.mjs` overlap
- deny HIGH/HOLD parallelism
- enforce merge-order metadata
- validate lane ownership
- validate command isolation
- read policy from `kohee.contract.json`

## P0-4 — Dispatch overwrite protection

State: active implementation through PR #101

Primary PR:

- PR #101

Reason:

- command dispatch must create isolated command records instead of updating unrelated queued issues.
- This is required for reliable parallel/touchless operation.

## P0-5 — Queue state machine

State: active documentation through PR #100

Primary PR:

- PR #100

Reason:

- needed to normalize queue/PR/workflow status names before automation and maintenance audit use them.

## P0-6 — Maintenance audit automation

State: active implementation through PR #99

Primary PR:

- PR #99

First phase must be read-only:

- no branch deletion
- no issue close
- no auto-merge
- no file write to repo state
- no deploy

Recommended rollout:

1. manual `workflow_dispatch`
2. optional daily read-only run after stable
3. issue #23 report
4. ACTIVE_QUEUE sync PR
5. safe branch deletion only after proven criteria and explicit approval

## P0-7 — Touchless LOW/MEDIUM execution

State: operational target

Goal:

- let the user issue goals once and avoid repeated manual continuation prompts.

Target execution flow:

1. user gives goal
2. ChatGPT decomposes tasks
3. safe lanes are parallelized automatically
4. PRs are created automatically only for concrete repo changes
5. GitHub native auto-merge is enabled for eligible safe PRs when possible
6. checks run under GitHub rules
7. safe LOW/MEDIUM failures are retried automatically when possible
8. final result report happens once at batch completion or precise blocker

## P0-8 — PR hygiene and usage cleanup

State: planned through maintenance audit / candidate J

Goal:

- ensure PRs are used for reviewable changes and validation, not task chatter.

Audit targets:

- stale merged branches left after PRs
- open PRs with no mergeable file change
- PRs used as TODO/status records
- many tiny sequential PRs touching the same file
- superseded PRs still open or unclear
- closed PR branches still alive

## P0-9 — GitHub App Worker Phase 2 dry-run

State: deferred until explicit user start

Requirements:

- local `gh auth status`
- local `wrangler whoami`

Must not:

- run from Codex Cloud
- enable write actions
- enable auto-merge
- enable issue close
- modify production runtime
- modify D1/auth/CSV/public behavior

---

# 5. Current blockers

## Blocker A — command/control-plane overlap

- PR #95 and PR #101 both touch `.github/workflows/kohee-command-dispatch.yml`.
- They require explicit merge order or rebase/fold decision.

## Blocker B — shared package script overlap

- PR #95 and PR #99 both touch `package.json`.
- PR #99 must rebase/update after #95 before merge.

## Blocker C — validation workflow mutation risk

- PR #95 touches `.github/workflows/pr-validate.yml`.
- After #95 merges, the next PR must prove required checks still run correctly.

## Blocker D — branch cleanup debt

- many historical feature/docs/fix branches remain after PR merges or superseded work.
- read-only maintenance audit should classify cleanup candidates before deletion automation.

## Blocker E — context fragmentation

- status is split across chat, issue #23, MASTER_CONTEXT, ACTIVE_QUEUE, and automation docs.
- stale task understanding and duplicate work remain possible.

---

# 6. Safe lanes and parallel defaults

Safe LOW/MEDIUM candidates:

- docs-only
- audit-only
- wording-only
- governance-only
- isolated frontend copy
- isolated automation tooling
- export-only CSV additions without public exposure changes
- read-only maintenance audits
- cleanup audit reporting

Not safe for parallel:

- D1/schema/migration
- auth/session/security
- public `/data` behavior
- CSV import/reset semantics
- Cloudflare secrets/deploy permissions
- GitHub App write enablement
- same-file overlap
- `scripts/test-unit.mjs` overlap
- manager role cleanup touching shared auth/server/tests
- automatic branch deletion
- issue-close automation

Parallel default rule:

- When multiple requested tasks are LOW/MEDIUM, independent, and non-overlapping, plan them as parallel lanes by default.
- Do not serialize safe independent docs/tooling lanes unless they touch the same files or require ordered merge.
- Merge remains sequential after checks and review-thread gates pass.
- Native auto-merge is preferred for eligible safe PRs.

---

# 7. Current HIGH/HOLD

- HOLD — D1 manager role schema removal
- HOLD — resetCsv redesign
- HOLD — evidence/category verification DB

These require explicit user approval.

---

# 8. Current next patch candidates

## Candidate A — Parallel lane validator

Status:

- active PR #95

## Candidate B — Dispatch overwrite protection

Status:

- active PR #101

## Candidate C — Read-only maintenance audit

Status:

- active PR #99

## Candidate D — ACTIVE_QUEUE semi-generated sync

Goal:

- reduce manual status drift.

## Candidate E — Queue aging and stale detection

Suggested future states:

- `STALE_CANDIDATE`
- `STALE`
- `SUPERSEDED`

## Candidate F — Command state machine

Status:

- active PR #100

## Candidate G — Structured Worker dry-run logs

Risk:

- MEDIUM
- must remain dry-run only

## Candidate H — Governance/doc overlap cleanup

Goal:

- reduce duplicated operational guidance across docs.

## Candidate I — Safe auto-merge implementation guard

Goal:

- encode safe auto-merge eligibility in command validation and future Worker decisions.

## Candidate J — PR hygiene audit

Goal:

- detect PR misuse and stale branch/PR cleanup targets.

---

# 9. Lane ownership direction

Future direction:

```json
{
  "laneOwners": {
    "GOVERNANCE": "chatgpt",
    "CSV_PIPELINE": "user_approval_required",
    "PUBLIC_EXPOSURE": "high_review",
    "AUTH_ROLE": "high_review",
    "DEPLOY_SAFETY": "user_approval_required"
  }
}
```

Purpose:

- safer auto-merge decisions
- future Worker orchestration
- explicit ownership boundaries

---

# 10. Do not touch without user approval

Never auto-change:

- D1 migrations
- auth/session
- public exposure rules
- CSV import/reset semantics
- deploy workflows/secrets for production behavior
- Cloudflare secrets
- GitHub App production write permissions
- destructive data behavior
- automatic branch deletion
- automatic issue close

These remain:

- HIGH
- HOLD
- user-approved only

---

# 11. Execution philosophy

Current KOHEE priority is not rapid feature expansion.

Current KOHEE priority is:

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

The current bottleneck is operational structure, not feature quantity.
