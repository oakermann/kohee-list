# KOHEE Active Queue

Last updated: 2026-05-11
Status owner: ChatGPT orchestration baseline

This file is the active operational queue for ChatGPT-led KOHEE LIST work.

Use this file as the current working overlay on top of `docs/KOHEE_MASTER_CONTEXT.md`.

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term source of truth
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue, blockers, next patch candidates, operational risks, orchestration status, cleanup targets, and automation maturity direction

---

# 0. Current operating mode

KOHEE LIST is currently operating in:

- ChatGPT-main executor/orchestrator mode
- GitHub evidence-first verification mode
- GitHub Actions validation-gate mode
- Codex reviewer/PATCH_READY support mode
- parallel-by-default mode for safe LOW/MEDIUM work
- touchless-execution direction for safe automation

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

Execution expectation:

- For LOW/MEDIUM tasks that ChatGPT can safely execute, ChatGPT should continue through task decomposition, lane planning, PR creation, checks, fix/retry, review-thread verification, merge, queue sync, and final evidence report without stopping at intermediate PR-open status.
- Stop early only for HOLD/HIGH, failed checks that cannot be safely auto-fixed, review findings, tool/API errors, missing permissions, unexpected runtime risk, merge conflict, or explicit user interruption.
- For multi-lane safe work, default to parallel planning and independent PR lanes when file/risk overlap checks pass.
- Final reporting should happen after the requested work batch is actually complete, not after each intermediate PR step.

Primary automation direction:

- minimize required user touches
- minimize intermediate status interruptions
- maximize safe autonomous LOW/MEDIUM execution
- keep HIGH/HOLD human-approved

---

# 1. Current repo state

Repository:

- `oakermann/kohee-list`

Branch:

- `main`

Current known state as of 2026-05-11:

- Open PRs: 0
- Active issue: #23 (`KOHEE_CLOUD_MAINTENANCE`)
- Open HIGH/HOLD implementation issue: none known
- Active failed PR: none known
- Active merge conflict: none known
- Branch count is high and needs cleanup-audit automation before any deletion automation.

Current repo inefficiency targets:

- stale merged branches
- overlapping automation docs
- repetitive governance PRs
- queue/status drift
- repeated user prompts for merge continuation
- excessive intermediate reporting

---

# 2. Current P0 queue

## P0-1 — ChatGPT-main stabilization

State: mostly completed / maintain

Completed baseline:

- `AGENTS.md`
- `docs/KOHEE_MASTER_CONTEXT.md`
- `kohee.contract.json`
- GitHub evidence-first rule
- Codex self-report distrust rule
- issue #23 maintenance consolidation

Remaining:

- prevent regression to Codex-main assumptions
- keep orchestration rules synchronized
- keep ChatGPT execution reports evidence-based
- keep execution flow interruption-free for safe LOW/MEDIUM work

---

## P0-2 — Master source-of-truth

State: completed / maintain

Canonical file:

- `docs/KOHEE_MASTER_CONTEXT.md`

Operational overlay:

- `docs/KOHEE_ACTIVE_QUEUE.md`

Current problem:

- operational status can still fragment across:
  - chat memory
  - issue #23
  - governance docs
  - future automation state

Direction:

- ACTIVE_QUEUE should become semi-generated from GitHub evidence over time.

Future sync candidates:

- open PR count
- failed checks
- stale branches
- HOLD items
- latest merged PRs
- queue age
- cleanup-audit summary
- stale workflow state

---

## P0-3 — Parallel lane enforcement

State: partially implemented / operationally important

Done:

- policy exists in docs/contracts
- risk lanes exist
- merge-order rules documented

Current gap:

- no hard validator for:
  - same-file overlap
  - shared test overlap
  - HIGH/HOLD parallel denial
  - merge-order conflicts
  - queued command overwrite/conflict

Primary next patch candidate:

- `scripts/validate-kohee-command.mjs`

Expected responsibilities:

- deny same-file overlap
- deny `scripts/test-unit.mjs` overlap
- deny HIGH/HOLD parallelism
- enforce merge-order metadata
- validate lane ownership
- validate command isolation
- read policy from `kohee.contract.json`

Related risk:

- silent parallel-lane conflict
- queue corruption
- stale branch merge ordering

Target execution model:

- parallel-first planning
- sequential merge after validation
- automatic retry for safe LOW/MEDIUM failures
- batch-completion reporting instead of PR-by-PR interruption

---

## P0-4 — Maintenance audit automation

State: promoted P0 automation-efficiency task

Goal:

- make cleanup/efficiency checks automatic before enabling automatic cleanup.

First phase must be read-only:

- no branch deletion
- no issue close
- no auto-merge
- no file write
- no deploy

Initial outputs:

- GitHub Actions summary
- optional issue #23 report comment later
- optional ACTIVE_QUEUE sync PR later

Audit targets:

- merged PR branches still present
- closed/unmerged PR branches still present
- stale branches
- stale open PRs
- failed workflows
- stale command issues
- ACTIVE_QUEUE vs actual GitHub state mismatch
- automation-doc overlap candidates
- duplicate governance docs
- repetitive operational flows
- cleanup candidates requiring manual review

Classification:

- `SAFE_DELETE_CANDIDATE`: merged PR head branch, head SHA included in main, not protected, not active work.
- `REVIEW_REQUIRED`: unmerged branch, unknown PR link, branch name suggests active/retry work, or related to a recent failed/closed PR.
- `HOLD`: `main`, protected/control-plane branch, watchdog branch, Phase 2 control-plane branch, HIGH/HOLD-related branch.

Recommended implementation candidate:

- `.github/workflows/kohee-maintenance-audit.yml`
- `scripts/kohee-maintenance-audit.mjs`

Recommended schedule:

- manual `workflow_dispatch` first
- optional daily read-only run after stable

Do not implement automatic deletion until the read-only report has been reviewed across multiple runs.

---

## P0-5 — Touchless LOW/MEDIUM execution

State: newly promoted operational target

Goal:

- let the user issue goals once and avoid repeated manual continuation prompts.

Target execution flow:

1. user gives goal
2. ChatGPT decomposes tasks
3. safe lanes are parallelized automatically
4. PRs are created automatically
5. checks are monitored automatically
6. safe LOW/MEDIUM failures are retried automatically
7. merge is completed automatically after evidence validation
8. ACTIVE_QUEUE sync happens automatically when relevant
9. final result report happens once at batch completion

Do not interrupt the user for:

- PR opened
- checks running
- waiting for merge
- stale branch update
- LOW docs/tooling continuation

Interrupt only for:

- HIGH/HOLD
- non-recoverable check failure
- review-blocking finding
- unexpected runtime risk
- merge conflict
- permission/tool/API error
- explicit user interruption

Long-term direction:

- touchless LOW/MEDIUM governance/tooling execution
- issue-driven autonomous maintenance
- minimal user-touch orchestration

---

## P0-6 — GitHub App Worker Phase 2 dry-run

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

Expected Worker:

- `kohee-github-app-worker-dry-run`

Required dry-run flags:

- `KOHEE_BOT_ENABLED=false`
- `KOHEE_BOT_DRY_RUN=true`
- `KOHEE_BOT_AUTO_MERGE_ENABLED=false`
- `KOHEE_BOT_ISSUE_CLOSE_ENABLED=false`
- `KOHEE_BOT_ALLOWED_REPOS=oakermann/kohee-list`

Recommended future direction:

1. read-only observability
2. queue synchronization
3. validator integration
4. safe LOW docs auto-merge
5. safe LOW tooling auto-merge
6. issue lifecycle automation
7. runtime automation later

Do not prioritize runtime write automation yet.

---

# 3. Current blockers

## Blocker A — automation control-plane incomplete

Problem:

- orchestration policy exists
- validator layer incomplete

Impact:

- future parallel lanes may conflict silently
- queue overwrite risk exists

Priority:

- operational HIGH
- not runtime HIGH

---

## Blocker B — context fragmentation

Problem:

- status split across:
  - chat context
  - issue #23
  - MASTER_CONTEXT
  - ACTIVE_QUEUE
  - automation docs

Impact:

- stale task understanding
- duplicate work
- outdated queue state

Mitigation:

- keep ACTIVE_QUEUE synchronized after major GitHub evidence changes

---

## Blocker C — missing operational observability

Current weakness:

- operational visibility is weaker than runtime visibility

Needed future observability:

- current HIGH/HOLD items
- failed workflows
- stale PRs
- stale branches
- unsafe pending merge
- audit warnings
- queue aging
- lane conflicts
- duplicate governance files
- automation cleanup debt

Long-term direction:

- internal operational dashboard
- not just cafe CRUD admin

---

## Blocker D — branch cleanup debt

Current weakness:

- many historical feature/docs/fix branches remain after PR merges or superseded work.

Risk:

- branch list noise
- stale branch reuse mistakes
- wrong-base branch work
- confusion about active vs completed lanes

Mitigation:

- read-only maintenance audit first
- safe deletion only after verified criteria and user-approved automation phase

---

## Blocker E — repetitive operational flow

Current weakness:

- repeated manual continuation prompts
- repeated merge confirmation prompts for LOW docs/tooling work
- repeated PR-open-only reporting

Impact:

- unnecessary user touches
- slower orchestration throughput
- higher operator fatigue

Direction:

- move toward touchless LOW/MEDIUM execution flow.

---

# 4. Current safe lanes

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
- Automatic retry is preferred over user interruption for safe LOW/MEDIUM failures.

---

# 5. Current HIGH/HOLD

## HOLD — D1 manager role schema removal

Reason:

- schema/runtime/test coupling remains
- explicit user approval required

---

## HOLD — resetCsv redesign

Reason:

- transactional/staging redesign required
- touches CSV semantics
- explicit user approval required

---

## HOLD — evidence/category verification DB

Future concepts:

- `cafe_evidence`
- `category_verifications`
- review memo
- source URL
- confidence/evidence level

Reason:

- schema/migration planning required
- retention/privacy review required
- explicit user approval required

---

# 6. Current known risks

## Operational risk

Current primary risk is:

- orchestration drift
- stale context
- policy mismatch
- queued command conflict
- stale branch confusion
- repetitive operational overhead

Current primary risk is not:

- missing cafe app features

---

## Command dispatch risk

`.github/workflows/kohee-command-dispatch.yml` currently:

- creates or updates KOHEE command issues
- is not a full lane validator

Potential issue:

- command overwrite/update conflict
- future batch conflict
- lane isolation weakness

Future fix:

- explicit command conflict validator
- stronger queue isolation
- stable command state machine

---

## Cleanup automation risk

Do not start with destructive cleanup.

Safe order:

1. read-only maintenance audit
2. issue #23 report
3. ACTIVE_QUEUE sync PR
4. cleanup candidate report
5. safe branch deletion only after proven criteria
6. LOW docs auto-merge after validator maturity

---

# 7. Current next patch candidates

## Candidate A — Parallel lane validator

Goal:

- deny same-file overlap
- deny shared test overlap
- deny HIGH/HOLD parallelism
- enforce merge-order metadata
- validate lane ownership
- validate queue isolation

Likely files:

- `scripts/validate-kohee-command.mjs`
- `.github/workflows/kohee-command-dispatch.yml`
- `package.json`

Risk:

- MEDIUM governance/tooling

---

## Candidate B — Dispatch overwrite protection

Goal:

- avoid updating unrelated queued command issue
- improve batch isolation
- improve queue auditability

Risk:

- MEDIUM governance/tooling

---

## Candidate C — Read-only maintenance audit

Goal:

- automatically detect cleanup/efficiency targets without modifying repo state.

Scope:

- stale branches
- merged PR branches
- stale PRs
- failed workflows
- queue mismatches
- stale command issues
- docs/automation overlap candidates
- duplicate governance docs
- repetitive operational flows

Likely files:

- `scripts/kohee-maintenance-audit.mjs`
- `.github/workflows/kohee-maintenance-audit.yml`
- `package.json`

Risk:

- LOW/MEDIUM governance/tooling
- read-only only

---

## Candidate D — ACTIVE_QUEUE semi-generated sync

Goal:

- reduce manual status drift.

Initial mode:

- report mismatch only
- later create PR to update ACTIVE_QUEUE

Inputs:

- GitHub PR state
- workflow status
- branch audit
- issue #23 state
- HIGH/HOLD issue state

---

## Candidate E — Queue aging and stale detection

Goal:

- detect stale branches
- detect stale command issues
- detect abandoned PRs
- mark stale queue items

Suggested future states:

- `STALE_CANDIDATE`
- `STALE`
- `SUPERSEDED`

---

## Candidate F — Command state machine

Suggested future lifecycle:

- `QUEUED`
- `ANALYZING`
- `PATCH_READY`
- `PR_OPEN`
- `CHECKS_RUNNING`
- `CHECKS_FAILED`
- `READY_TO_MERGE`
- `MERGED`
- `DEPLOYED`
- `HOLD_HIGH`
- `HOLD_USER`
- `SUPERSEDED`
- `STALE`

Purpose:

- future automation synchronization
- Worker orchestration consistency
- GitHub issue state consistency

---

## Candidate G — Structured Worker dry-run logs

Goal:

- auditable dry-run decision logs
- improve future GitHub App observability

Risk:

- MEDIUM
- must remain dry-run only

---

## Candidate H — Governance/doc overlap cleanup

Goal:

- reduce duplicated operational guidance across docs.

Targets:

- duplicated automation explanations
- stale operational status docs
- repeated governance wording
- overlapping queue definitions

Direction:

- MASTER_CONTEXT = long-term policy
- ACTIVE_QUEUE = live operational overlay
- STATUS docs = historical/reference layer only

---

# 8. Lane ownership direction

Future direction:

```json
{
  "laneOwners": {
    "GOVERNANCE": "chatg