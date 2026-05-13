# Automation Platform Queue

Last updated: 2026-05-14
Purpose: active execution queue for the project-factory automation platform.

## Core objective

Build a reusable automation platform, not a KOHEE-only helper.

Target workflow:

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> Codex Review/review threads -> automation decision -> merge or hold
```

User-facing goal:

```text
진행 -> automation routes the next task -> Local Codex works -> PR/checks/review evidence appears -> LOW/MEDIUM auto-merge if gates pass; HIGH/HOLD waits for user approval
```

PR evidence means PR metadata, checks, changed files, and Codex Review/review-thread state.

## Active execution rule

- `docs/AUTOMATION_OPERATOR_RAIL.md` is the active operating rail.
- This queue defines the next build order.
- `docs/queues/KOHEE_PRODUCT.md` remains paused until the automation rail can safely manage product work.
- Enterprise hardening documents are reference/backlog, not the active execution queue.
- Open PRs, failed checks, unresolved review threads, and issue `#23` blockers come before new work.
- If this queue and a `TASK_PACKET` conflict, stop and report `HOLD_QUEUE_CONFLICT`.

## Preserve from automation phases 1-3

Keep these working parts:

- GitHub evidence as source of truth.
- PR URL, head SHA, changed files, checks, review threads, issue state.
- Local Codex as actual code worker.
- GitHub Actions as validation gate.
- `MERGE / FIX / HOLD / NEXT` decision language.
- `scripts/policy-risk-report.mjs` report-only risk classification.
- Forbidden-area protection for D1/schema, auth/session, CSV import/reset, public data, deploy/settings, credentials, package/lockfile/install-script risk.

## Non-negotiable anti-redesign guardrail

Enterprise hardening must not redesign the operating model.

Allowed improvements:
- clearer queue wording.
- docs, schema, fixtures, dry-run scripts, and report-only checkers.
- observability, decision records, recovery notes, and security audits.
- project profile and solo-developer operator UX support.

Forbidden unless the owner explicitly approves:
- changing ChatGPT from orchestrator.
- changing Local Codex from worker.
- replacing GitHub evidence as source of truth.
- bypassing the active queue/router.
- enabling real GitHub write paths.
- enabling native auto-merge or unattended loops.
- touching product runtime, D1/schema/data, auth, CSV, public `/data`, deploy settings, secrets, package, lockfile, or install-script behavior.

## Correct automation stages

### 1. Evidence foundation

Status: complete and preserved.

Meaning:
- PRs are judged from GitHub evidence, not Codex self-report.
- Checks and review threads are part of the merge decision.
- Codex Review/review threads must be resolved or explicitly waived before merge.

### 2. Local Codex worker discipline

Status: complete enough and preserved.

Meaning:
- Local Codex does scoped local edits/tests/PRs.
- Local Codex reports `Status / Blocker / Next action / Evidence`.
- Local Codex does not decide unsafe production work.

### 3. Risk and decision gates

Status: complete enough and preserved.

Meaning:
- LOW/MEDIUM/HIGH/HOLD classification exists.
- Policy-risk reporting exists.
- HIGH/HOLD requires user approval.

### 4. Click-run task rail

Status: baseline complete and preserved.

Goal:
- User tells ChatGPT `진행`.
- ChatGPT creates or selects a task packet.
- Cloudflare Worker/GitHub App records the task packet in GitHub.
- Local Codex reads the GitHub task packet and performs one scoped task.
- GitHub Actions validates the PR.
- Codex Review/review threads are checked before merge readiness.
- LOW/MEDIUM can auto-merge only after evidence gates pass.
- HIGH/HOLD waits for explicit user approval.

Required outputs:
1. `TASK_PACKET` standard: complete in PR #188.
2. GitHub task queue bridge, initially issue `#23`: dry-run complete in PR #189.
3. Local Codex watcher rule: dry-run complete in PR #190.
4. LOW/MEDIUM auto-merge evidence gate definition, including Codex Review/review-thread resolution: dry-run complete in PR #191.
5. Cloudflare/GitHub App write path for real task packets and evidence comments: HOLD until explicitly approved.

### 5. Project profiles

Status: active next work.

Goal:
- Make the platform manage multiple projects.

Required project profiles:
- KOHEE LIST: v0 profile complete in PR #192.
- News app: placeholder only until intake data is supplied.
- Handover/internal work app: placeholder only until intake data is supplied.
- Blog/status site: placeholder only until intake data is supplied.

Each profile needs:
- repo and local path.
- active queue.
- risk rules.
- forbidden areas.
- test commands.
- deploy rules.
- product-specific invariants.

### 6. Cloudflare/GitHub App control plane

Status: dry-run hardening next; real writes remain HOLD.

Goal:
- Harden the Cloudflare Worker/GitHub App as the online execution arm.

Responsibilities:
- receive ChatGPT task requests.
- write task packets to GitHub.
- maintain task/evidence state.
- observe checks/review state.
- trigger allowed LOW/MEDIUM auto-merge only after gates pass.
- hold HIGH/HOLD for user approval.
- support future dashboard/notifications/multi-project control.

## Queue operating order

Run this order exactly unless there is an open PR, failed check, unresolved review thread, or explicit owner direction.

### Step 0. Clear active PR/evidence blockers first

Before starting any new task, inspect:
1. open PRs.
2. failed checks.
3. unresolved review threads.
4. issue `#23` active blockers.
5. this queue's next unblocked step.

If an open PR exists, do not start unrelated work. Review or fix that PR first.

### Step 1. Finish current validation-ready PRs

Current PR order:
1. PR #194: project profile validator v0.
2. PR #196: project profile intake template.
3. PR #195: automation decision record dry-run.
4. PR #197: control-plane hardening dry-run.

Rules:
- Merge only after evidence gates pass.
- If checks fail, report `FIX_REQUIRED`.
- If review threads are unresolved, report `FIX_REQUIRED` or `HOLD`.
- If changed files drift outside the PR body, report `HOLD_SCOPE_DRIFT`.

### Step 2. Observability and solo-developer operation

After Step 1, execute these task packets from issue `#23` in this order:

1. `automation-status-snapshot-dry-run-20260514`
   - Purpose: show active lane, active queue, open PRs, checks, review threads, blockers, stale signals, merge candidates, and next action from GitHub evidence.
   - Output type: docs/scripts/fixtures dry-run only.

2. `automation-solo-dev-operator-ux-20260514`
   - Purpose: convert status snapshots into a solo-developer facing summary: Today Summary, Next Best Action, Why Blocked, Safe To Continue, Merge Candidates, Stale Work Warning, Project Quick Switch, and One-Click Next Action wording.
   - Output type: docs first; optional script dry-run only.

### Step 3. Risk-tier and recovery policy

After Step 2, execute:

1. `automation-risk-tier-playbook-policy-20260514`
   - Purpose: define LOW, MEDIUM, HIGH, and CRITICAL execution policy.
   - Required policy:
     - LOW may automate after gates.
     - MEDIUM may automate only when the project profile and evidence gates allow it.
     - HIGH remains HOLD by default.
     - only explicitly pre-approved HIGH playbooks may run with rollback evidence.
     - CRITICAL remains owner-approval-only.
   - Output type: docs/policy or dry-run checker only.
   - Do not enable HIGH automation.

### Step 4. Phase 6B hardening execution queue

After Step 3, promote Phase 6B from reference backlog into scoped queue tasks in this order:

1. `6B-1 trust-policy-approval`
   - Input trust boundary, policy-as-code direction, approval ledger, owner override, protected environment approval, ADR policy.
   - Docs/schema/design first.

2. `6B-2 event-worker-lease`
   - Webhook idempotency, redelivery, task lease, heartbeat, stale working detection, duplicate pickup prevention.
   - Docs/schema/dry-run first.

3. `6B-3 supply-chain-ci`
   - Workflow permission audit, action-pinning review, high-risk workflow pattern audit, OIDC readiness, dependency/install safeguards.
   - Audit/report-only first; do not mutate workflow or package files without approval.

4. `6B-4 recovery-rollback`
   - Rollback note, last-known-good SHA policy, failed PR history, blocked-lane history, decision log, incident playbook.
   - Docs/schema/dry-run first.

5. `6B-5 observability-control-board`
   - Reconciliation, telemetry/event journal, DORA-lite metrics, snapshot/replay, control-board data-source mapping and MVP design.
   - Read-only design first; no runtime dashboard without approval.

6. `6B-6 budget-retry-maturity-prep`
   - Cost/quota guardrail, retry budget, concurrency cap, daily PR/lane cap, Phase 6C readiness checklist, remaining HOLD list.
   - Run last because it consumes outputs from 6B-1 through 6B-5.

### Step 5. Phase 6C maturity gate

Run only after Step 4 is accounted for.

Gate must answer:
- Does evidence-based MERGE/FIX/HOLD/NEXT work from GitHub evidence?
- Does status snapshot/solo-dev UX make the next action clear?
- Does stale/lease policy exist?
- Does supply-chain audit exist?
- Does recovery/rollback/decision log policy exist?
- Are remaining HIGH/HOLD/CRITICAL items explicit?
- Can KOHEE product work resume under the platform, or should automation work continue?

Do not resume `docs/queues/KOHEE_PRODUCT.md` unless the maturity gate passes or the owner/ChatGPT explicitly defers the automation lane for an urgent product issue.

## Active HOLD list

Do not implement without explicit user approval:

- HIGH/HOLD auto-merge.
- D1/schema/migration/data mutation.
- auth/session/security behavior changes.
- CSV import/reset behavior changes.
- public data behavior changes.
- deploy/Cloudflare production settings.
- secrets/credentials.
- package/lockfile/install-script behavior without review.
- broad product work while automation lane is active.
- real GitHub App write path.
- native auto-merge enablement.
- unattended worker loop.
- runtime dashboard/control board.

## Reference/backlog docs

These documents remain useful but are not the active execution queue unless Step 4 promotes a scoped task:

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`
- `docs/AUTOMATION_PLATFORM_6B*.md`
- `docs/AUTOMATION_PLATFORM_6C_MATURITY_GATE.md`
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`

Use them for policy details only when the active task needs them.

## Reporting rule

Use:

```text
Status / Blocker / Next action / Evidence
```
