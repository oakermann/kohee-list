# Automation Platform Queue

Last updated: 2026-05-13
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

Status: active work.

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
1. `TASK_PACKET` standard.
2. GitHub task queue location, initially issue `#23` or a dedicated task issue.
3. Cloudflare/GitHub App write path for task packets and evidence comments.
4. Local Codex polling/watch rule for new task packets.
5. LOW/MEDIUM auto-merge evidence gate definition, including Codex Review/review-thread resolution.

### 5. Project profiles

Status: not started.

Goal:
- Make the platform manage multiple projects.

Required project profiles:
- KOHEE LIST.
- News app.
- Handover/internal work app.
- Blog/status site.

Each profile needs:
- repo and local path.
- active queue.
- risk rules.
- forbidden areas.
- test commands.
- deploy rules.
- product-specific invariants.

### 6. Cloudflare/GitHub App control plane

Status: not started beyond earlier foundation.

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

### 4A. Replace document-heavy execution with task packets

Add a concise task-packet contract.

Required fields:

```text
task_id:
project:
lane:
risk:
mode:
goal:
allowed_files:
forbidden_areas:
checks:
stop_condition:
report_format:
merge_policy:
```

### 4B. Define GitHub task queue bridge

Choose the first GitHub storage location for task packets.

Default:
- issue `#23` until a dedicated queue issue exists.

Rules:
- one task packet per task.
- Local Codex must not start a new task while an open task PR is unresolved.
- task packet updates must preserve evidence.

### 4C. Define Local Codex watcher

Local Codex watcher target:

```text
read task packet -> claim one task -> work one branch -> run checks -> open/update PR -> report -> stop
```

### 4D. Define LOW/MEDIUM auto-merge gate

LOW/MEDIUM auto-merge is allowed only when all are true:

- project profile allows it.
- changed files are expected.
- forbidden areas absent.
- `PR Validate` success.
- `Validate` success.
- unresolved review threads absent.
- Codex Review threads resolved or explicitly waived.
- head SHA stable.
- policy-risk is LOW or approved MEDIUM.
- PR evidence is complete.

HIGH/HOLD is never auto-merged.

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
