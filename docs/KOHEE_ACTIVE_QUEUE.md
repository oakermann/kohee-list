# KOHEE Active Queue

Last updated: 2026-05-11
Status owner: ChatGPT orchestration baseline

This file is the active operational queue for ChatGPT-led KOHEE LIST work.

Use this file as the current working overlay on top of `docs/KOHEE_MASTER_CONTEXT.md`.

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term source of truth
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue, blockers, next patch candidates, operational risks, orchestration status, cleanup targets, and automation maturity direction

---

## 0. Current operating mode

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

- For LOW/MEDIUM tasks that ChatGPT can safely execute, ChatGPT should continue through task decomposition, lane planning, PR creation, checks, safe fix/retry, review-thread verification, merge, queue sync, and final evidence report without stopping at intermediate PR-open status.
- Stop early only for HOLD/HIGH, failed checks that cannot be safely auto-fixed, review findings, tool/API errors, missing permissions, unexpected runtime risk, merge conflict, or explicit user interruption.
- For multi-lane safe work, default to parallel planning and independent PR lanes when file/risk overlap checks pass.
- Final reporting should happen after the requested work batch is actually complete, not after each intermediate PR step.

Primary automation direction:

- minimize required user touches
- minimize intermediate status interruptions
- maximize safe autonomous LOW/MEDIUM execution
- keep HIGH/HOLD human-approved

---

## 1. Current repo state

Current known state as of 2026-05-11:

- Repository: `oakermann/kohee-list`
- Branch: `main`
- Open PRs: 0 when last synced before this update
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

## 2. Current P0 queue

### P0-1 — ChatGPT-main stabilization

State: mostly completed / maintain

Remaining:

- prevent regression to Codex-main assumptions
- keep orchestration rules synchronized
- keep ChatGPT execution reports evidence-based
- keep execution flow interruption-free for safe LOW/MEDIUM work

### P0-2 — Master source-of-truth

State: completed / maintain

Canonical file:

- `docs/KOHEE_MASTER_CONTEXT.md`

Operational overlay:

- `docs/KOHEE_ACTIVE_QUEUE.md`

Future sync candidates:

- open PR count
- failed checks
- stale branches
- HOLD items
- latest merged PRs
- queue age
- cleanup-audit summary
- stale workflow state

### P0-3 — Parallel lane enforcement

State: partially implemented / operationally important

Current gap:

- no hard validator for same-file overlap
- no hard validator for shared test overlap
- no hard validator for HIGH/HOLD parallel denial
- no hard validator for merge-order conflicts
- no hard validator for queued command overwrite/conflict

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

Target execution model:

- parallel-first planning
- sequential merge after validation
- automatic retry for safe LOW/MEDIUM failures
- batch-completion reporting instead of PR-by-PR interruption

### P0-4 — Maintenance audit automation

State: promoted P0 automation-efficiency task

Goal:

- make cleanup/efficiency checks automatic before enabling automatic cleanup.

First phase must be read-only:

- no branch deletion
- no issue close
- no auto-merge
- no file write
- no deploy

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

Recommended rollout:

1. manual `workflow_dispatch`
2. optional daily read-only run after stable
3. issue #23 report
4. ACTIVE_QUEUE sync PR
5. safe branch deletion only after proven criteria and explicit approval

### P0-5 — Touchless LOW/MEDIUM execution

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

### P0-6 — GitHub App Worker Phase 2 dry-run

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

## 3. Current blockers

### Blocker A — automation control-plane incomplete

- orchestration policy exists
- validator layer incomplete
- future parallel lanes may conflict silently
- queue overwrite risk exists

### Blocker B — context fragmentation

- status is split across chat, issue #23, MASTER_CONTEXT, ACTIVE_QUEUE, and automation docs
- stale task understanding and duplicate work remain possible

### Blocker C — missing operational observability

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

### Blocker D — branch cleanup debt

Current weakness:

- many historical feature/docs/fix branches remain after PR merges or superseded work.

Risk:

- branch list noise
- stale branch reuse mistakes
- wrong-base branch work
- confusion about active vs completed lanes

### Blocker E — repetitive operational flow

Current weakness:

- repeated manual continuation prompts
- repeated merge confirmation prompts for LOW docs/tooling work
- repeated PR-open-only reporting

Direction:

- move toward touchless LOW/MEDIUM execution flow.

---

## 4. Safe lanes and parallel defaults

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

## 5. Current HIGH/HOLD

- HOLD — D1 manager role schema removal
- HOLD — resetCsv redesign
- HOLD — evidence/category verification DB

These require explicit user approval.

---

## 6. Current known risks

Operational risk:

- orchestration drift
- stale context
- policy mismatch
- queued command conflict
- stale branch confusion
- repetitive operational overhead

Cleanup automation risk:

- do not start with destructive cleanup
- read-only audit must come first
- branch deletion and issue close automation remain HOLD until proven safe

---

## 7. Current next patch candidates

### Candidate A — Parallel lane validator

Likely files:

- `scripts/validate-kohee-command.mjs`
- `.github/workflows/kohee-command-dispatch.yml`
- `package.json`

Risk:

- MEDIUM governance/tooling

### Candidate B — Dispatch overwrite protection

Goal:

- avoid updating unrelated queued command issue
- improve batch isolation
- improve queue auditability

Risk:

- MEDIUM governance/tooling

### Candidate C — Read-only maintenance audit

Likely files:

- `scripts/kohee-maintenance-audit.mjs`
- `.github/workflows/kohee-maintenance-audit.yml`
- `package.json`

Risk:

- LOW/MEDIUM governance/tooling
- read-only only

### Candidate D — ACTIVE_QUEUE semi-generated sync

Goal:

- reduce manual status drift.

Initial mode:

- report mismatch only
- later create PR to update ACTIVE_QUEUE

### Candidate E — Queue aging and stale detection

Suggested future states:

- `STALE_CANDIDATE`
- `STALE`
- `SUPERSEDED`

### Candidate F — Command state machine

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

### Candidate G — Structured Worker dry-run logs

Risk:

- MEDIUM
- must remain dry-run only

### Candidate H — Governance/doc overlap cleanup

Goal:

- reduce duplicated operational guidance across docs.

Direction:

- MASTER_CONTEXT = long-term policy
- ACTIVE_QUEUE = live operational overlay
- STATUS docs = historical/reference layer only

---

## 8. Lane ownership direction

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

## 9. Admin/review direction

Direction:

- not a generic CRUD admin
- not a broad review app
- review workflow console
- evidence-first curation system

Important future concepts:

- evidence
- hold reason
- duplicate suspicion
- category verification
- review diff
- staged review application

Review console remains lower priority than operational stabilization.

---

## 10. Completed baseline

Completed baseline items:

- ChatGPT-main transition baseline
- `docs/KOHEE_MASTER_CONTEXT.md`
- `docs/KOHEE_ACTIVE_QUEUE.md`
- Codex self-report distrust baseline
- governance contract structure
- issue #23 maintenance consolidation
- scheduled Codex fan-out removal
- manager runtime/admin removal
- user-facing operator redaction
- manager frontend label removal
- policy guard baseline

---

## 11. Do not touch without user approval

Never auto-change:

- D1 migrations
- auth/session
- public exposure rules
- CSV import/reset semantics
- deploy workflows
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

## 12. Execution philosophy

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

The current bottleneck is operational structure, not feature quantity.
