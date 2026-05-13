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

## Preserve from automation phases 1-3

Keep these working parts:

- GitHub evidence as source of truth.
- PR URL, head SHA, changed files, checks, review threads, issue state.
- Local Codex as actual code worker.
- GitHub Actions as validation gate.
- `MERGE / FIX / HOLD / NEXT` decision language.
- `scripts/policy-risk-report.mjs` report-only risk classification.
- Forbidden-area protection for D1/schema, auth/session, CSV import/reset, public data, deploy/settings, credentials, package/lockfile/install-script risk.

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

LOW/MEDIUM auto-merge evidence gate definition, including Codex Review/review-thread resolution.

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

## Current next actions

### 5A. Add project profile validator v0

Add a report/check script for managed project profiles.

Rules:
- `docs/project-profiles/kohee-list.json` must pass required field validation.
- placeholder projects remain HOLD/not routable until they have real profile data.
- no GitHub writes, deploys, secrets, product runtime changes, or auto-merge enablement.

### 5B. Add automation decision record dry-run

Combine task packet, project profile, policy-risk output, and PR evidence fixtures into one decision record.

Allowed outputs:
- `NEXT`
- `FIX_REQUIRED`
- `HOLD`
- `MERGE_READY_DRY_RUN`

Real merge, GitHub writes, and native auto-merge enablement remain forbidden.
Codex Review threads resolved or explicitly waived.

### 5C. Add project profile intake template

Define the data needed before adding News app, Handover/internal work app, or Blog/status site as managed projects.

Required intake data:
- repository and default branch.
- local path policy.
- active queue and lane.
- risk rules and forbidden areas.
- validation commands.
- deploy policy.
- product-specific invariants.

### 6A. Control-plane hardening design dry-run

Validate, from docs and fixtures only, the future Cloudflare/GitHub App control-plane flow:

- task enqueue.
- evidence observe.
- merge decision.
- HOLD/FIX_REQUIRED reporting.

No issue comment write, PR merge, secrets, deploy, native auto-merge, or unattended loop.

### HOLD. Real control-plane write path

Do not implement without explicit user approval:
- Cloudflare/GitHub App writes real `TASK_PACKET` comments to issue `#23`.
- Cloudflare/GitHub App records live PR evidence comments.
- Cloudflare/GitHub App merges LOW/MEDIUM PRs after gates pass.
- native auto-merge enablement.

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

## Reference/backlog docs

These documents remain useful but are not the active execution queue:

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
