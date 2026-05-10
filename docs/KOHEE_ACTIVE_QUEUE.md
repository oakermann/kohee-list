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

---

## P0-4 — GitHub App Worker Phase 2 dry-run

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

Long-term direction:

- internal operational dashboard
- not just cafe CRUD admin

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

## Candidate C — Structured Worker dry-run logs

Goal:

- auditable dry-run decision logs
- improve future GitHub App observability

Risk:

- MEDIUM
- must remain dry-run only

---

## Candidate D — Queue aging and stale detection

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

## Candidate E — Command state machine

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

# 8. Lane ownership direction

Future direction:

```json
{
  "laneOwners": {
    "GOVERNANCE": "chatgpt",
    "CSV_PIPELINE": "user_approval_required",
    "PUBLIC_EXPOSURE": "high_review"
  }
}
```

Purpose:

- safer auto-merge decisions
- future Worker orchestration
- explicit ownership boundaries

---

# 9. Current admin/review direction

Direction:

- not a generic CRUD admin
- not a broad review app

Target:

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

# 10. Current completed baseline

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

These remain:

- HIGH
- HOLD
- user-approved only

---

# 12. Current execution philosophy

Current KOHEE priority is not rapid feature expansion.

Current KOHEE priority is:

- operational stabilization
- orchestration hardening
- source-of-truth consolidation
- safe automation layering
- future parallel execution safety
- operational observability

The current bottleneck is operational structure, not feature quantity.
