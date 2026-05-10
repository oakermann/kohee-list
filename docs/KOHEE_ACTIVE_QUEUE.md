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

# 2. Safe auto-merge activation

State: P0 operational efficiency target

Goal:

- reduce user touches before GitHub App Worker Phase 3+ is available.
- let GitHub wait for required checks and merge eligible safe PRs automatically.

Default flow for eligible LOW/MEDIUM PRs:

1. create PR
2. verify changed files and risk lane
3. deny HIGH/HOLD paths and behaviors
4. verify no unresolved review thread at the time auto-merge is enabled
5. enable GitHub native auto-merge
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

# 3. Current repo state

Repository:

- `oakermann/kohee-list`

Branch:

- `main`

Current known state as of 2026-05-11:

- Active issue: #23 (`KOHEE_CLOUD_MAINTENANCE`)
- Open HIGH/HOLD implementation issue: none known
- Branch count is high and needs cleanup-audit automation before any deletion automation.

Current repo inefficiency targets:

- stale merged branches
- overlapping automation docs
- repetitive governance PRs
- queue/status drift
- repeated user prompts for merge continuation
- excessive intermediate reporting
- direct manual merge polling where auto-merge can safely wait instead
- PRs being used as progress/status artifacts instead of clean change units

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

Future sync candidates:

- open PR count
- failed checks
- stale branches
- HOLD items
- latest merged PRs
- queue age
- cleanup-audit summary

## P0-3 — Parallel lane enforcement

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

Recommended implementation candidate:

- `.github/workflows/kohee-maintenance-audit.yml`
- `scripts/kohee-maintenance-audit.mjs`

## P0-5 — Touchless LOW/MEDIUM execution

State: promoted operational target

Goal:

- let the user issue goals once and avoid repeated manual continuation prompts.

Target execution flow:

1. user gives goal
2. ChatGPT decomposes tasks
3. safe lanes are parallelized automatically
4. PRs are created automatically only for concrete repo changes
5. GitHub native auto-merge is enabled for eligible safe PRs
6. checks run under GitHub rules
7. safe LOW/MEDIUM failures are retried automatically when possible
8. final result report happens once at batch completion or precise blocker

## P0-6 — Safe auto-merge activation

State: P0 target

Goal:

- use repository native auto-merge for eligible safe PRs to reduce manual polling and user continuation prompts.

Required behavior:

- direct manual merge is no longer the default for eligible safe LOW/MEDIUM PRs.
- auto-merge enablement should be attempted after file/risk/review-thread gates pass.
- ChatGPT should verify the final merged state later or report the blocker.

## P0-7 — PR hygiene and usage cleanup

State: newly promoted operational cleanup target

Goal:

- ensure PRs are used for their original purpose: reviewable changes and validation, not task chatter.

Audit targets:

- stale merged branches left after PRs
- open PRs with no mergeable file change
- PRs used as TODO/status records
- many tiny sequential PRs touching the same file
- superseded PRs still open or unclear
- closed PR branches still alive

Future maintenance audit should classify these as:

- `OK_CHANGE_UNIT`
- `MERGED_BRANCH_CLEANUP_CANDIDATE`
- `SUPERSEDED_PR`
- `STATUS_ONLY_PR_MISUSE`
- `SAME_FILE_PR_FRAGMENTATION`
- `REVIEW_REQUIRED`

## P0-8 — GitHub App Worker Phase 2 dry-run

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

## Blocker A — automation control-plane incomplete

- orchestration policy exists
- validator layer incomplete
- future parallel lanes may conflict silently
- queue overwrite risk exists

## Blocker B — context fragmentation

- status is split across chat, issue #23, MASTER_CONTEXT, ACTIVE_QUEUE, and automation docs
- stale task understanding and duplicate work remain possible

## Blocker C — missing operational observability

Needed future observability:

- current HIGH/HOLD items
- failed workflows
- stale PRs
- stale branches
- unsafe pending merge
- audit warnings
- queue aging
- lane conflicts

## Blocker D — branch cleanup debt

- many historical feature/docs/fix branches remain after PR merges or superseded work
- read-only maintenance audit should classify cleanup candidates before deletion automation

## Blocker E — repetitive operational flow

- repeated manual continuation prompts
- repeated merge confirmation prompts for LOW docs/tooling work
- repeated PR-open-only reporting
- direct merge polling when auto-merge can safely wait

## Blocker F — PR usage drift

- PRs can drift into progress-report/status-tracking artifacts if not governed.
- ACTIVE_QUEUE/issues should carry task status; PRs should carry concrete repo changes.

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

Likely files:

- `scripts/validate-kohee-command.mjs`
- `.github/workflows/kohee-command-dispatch.yml`
- `package.json`

Risk:

- MEDIUM governance/tooling

## Candidate B — Dispatch overwrite protection

Goal:

- avoid updating unrelated queued command issue
- improve batch isolation
- improve queue auditability

Risk:

- MEDIUM governance/tooling

## Candidate C — Read-only maintenance audit

Likely files:

- `scripts/kohee-maintenance-audit.mjs`
- `.github/workflows/kohee-maintenance-audit.yml`
- `package.json`

Risk:

- LOW/MEDIUM governance/tooling
- read-only only

## Candidate D — ACTIVE_QUEUE semi-generated sync

Goal:

- reduce manual status drift.

## Candidate E — Queue aging and stale detection

Suggested future states:

- `STALE_CANDIDATE`
- `STALE`
- `SUPERSEDED`

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

Scope:

- status-only PRs
- same-file PR fragmentation
- superseded open/closed PRs
- merged branches still present
- PRs that should have been issues or ACTIVE_QUEUE updates

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

# 10. Admin/review direction

Direction:

- not a generic CRUD admin
- not a broad review app
- review workflow console
- evidence-first curation system

Review console remains lower priority than operational stabilization.

---

# 11. Do not touch without user approval

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

# 12. Execution philosophy

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
