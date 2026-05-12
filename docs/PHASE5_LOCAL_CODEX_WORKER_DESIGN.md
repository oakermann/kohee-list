# Phase 5 Local Codex Worker Design

Status: design-first / do not enable unattended execution yet
Date: 2026-05-12
Owner: ChatGPT design, Local Codex implementation
Lane: AUTOMATION_CONNECTIVITY / LOCAL_WORKER / DEPLOY_SAFETY
Risk: HIGH until Phase 3 and Phase 4 are proven

## Goal

Phase 5 turns the home PC Local Codex environment into a controlled worker that can receive safe KOHEE tasks from GitHub and produce scoped PRs with minimal manual copying.

The goal is not to make the PC execute arbitrary commands. The goal is to reduce friction while keeping GitHub as source of truth and keeping HIGH/HOLD work blocked.

## Cost target

Phase 5 should stay in the near-free operating model:

- GitHub public repo standard Actions: use existing free public-repo runner path.
- Cloudflare Workers Free: webhook/control traffic should stay far below the free request limit.
- Workers Logs Free: keep structured logs small and sampled enough to stay within free log limits.
- Local Codex: use the existing home PC instead of paid cloud runners.
- No paid queues, external SaaS orchestrators, or larger GitHub runners by default.

## Prerequisites

Do not implement Phase 5 until:

- Phase 3 safe issue-comment bridge is merged and stable.
- Phase 4 native auto-merge design/readiness audit is complete.
- Local Codex runbook is stable.
- command dispatch create-only/no-overwrite is active.
- command validator is active in `npm run test:unit`.
- scheduled maintenance remains read-only.
- Worker remains dry-run-first with explicit write gates.

## Non-goals

Phase 5 must not implement:

- arbitrary remote shell execution from GitHub comments
- automatic D1/schema/auth/CSV/public-data/deploy/secrets work
- direct production deploy commands
- direct merge bot behavior
- branch deletion automation
- issue close automation
- background work without a visible GitHub issue/PR trail
- paid external queue/orchestrator dependency

## Architecture

Actors:

- User: approves HIGH/HOLD work and controls the home PC.
- ChatGPT: planner, reviewer, queue maintainer, MERGE/FIX/HOLD/NEXT judge.
- GitHub: source of truth for issues, PRs, checks, comments, and logs.
- GitHub Actions: required validation gate.
- GitHub App Worker: safe webhook/status bridge and later coordinator.
- Local Codex Worker: home-PC executor for approved LOCAL_TRACK tasks.

Data flow:

1. User or ChatGPT creates/updates task state in issue `#23` or a command issue.
2. Worker observes and classifies the task.
3. Local Codex checks GitHub for the next eligible task.
4. Local Codex creates a dedicated worktree/branch.
5. Local Codex edits only allowed files for the task lane.
6. Local Codex runs required local checks.
7. Local Codex opens a scoped PR and comments status/evidence.
8. GitHub Actions runs PR gates.
9. ChatGPT and/or Phase 4 native auto-merge path decides next action.

## Worker mode options

### Option A: Manual trigger loop

The user says to Local Codex: `작업 시작해`.

Pros:

- lowest risk
- no daemon needed
- easy to stop

Cons:

- user still triggers each batch

### Option B: Local polling loop

A local script periodically checks GitHub for eligible KOHEE_COMMAND tasks.

Pros:

- closer to autonomous operation
- works without inbound network exposure
- can run behind home NAT/Tailscale

Cons:

- must prevent duplicate work
- must log clearly
- must have a kill switch

### Option C: Webhook-to-local bridge

The Cloudflare Worker signals the local PC through a secure tunnel or queue.

Pros:

- fastest reaction

Cons:

- more complex
- larger security surface
- not needed before Phase 5B

Recommendation:

Start with Option A, then add Option B only after Phase 3/4 are stable. Avoid Option C until there is a proven need.

## Phase 5A: local worker runbook hardening

Risk: LOW/MEDIUM

Scope:

- document exact local prerequisites
- document worktree naming rules
- document task-pick rules
- document stop conditions
- add a local preflight checklist script if needed

No daemon, no auto-execution.

## Phase 5B: local task picker dry-run

Risk: MEDIUM

Scope:

- local script reads GitHub task state
- chooses the next eligible LOCAL_TRACK LOW task
- prints what it would run
- no repo writes unless user confirms
- no background daemon

## Phase 5C: local controlled worker loop

Risk: HIGH until approved

Scope:

- local loop runs only when user starts it
- picks one task at a time
- creates worktree/branch
- opens PR
- stops after each PR unless configured otherwise

Hard requirements:

- kill switch file or env var
- max one active task per lane
- max one PR per loop by default
- logs to local file and GitHub issue/PR
- refuses HIGH/HOLD tasks
- refuses sensitive paths unless explicitly approved

## Task eligibility

Eligible for semi-automatic local execution:

- LOW docs-only
- LOW tooling-only
- LOW audit-only
- LOW test-only
- MEDIUM only if explicitly scoped and not touching HOLD paths

Always refuse or HOLD:

- D1/schema/migrations
- auth/session/security
- CSV import/reset semantics
- public `/data` behavior
- production deploy/secrets
- branch deletion
- issue close automation
- direct merge bot
- GitHub App production write enablement

## Required local checks

Default checks:

- `npm run check:deploy-sync`
- `npm run test:unit`
- `npm run audit:kohee`
- `git diff --check`

Add as needed:

- `npm run verify:release`
- `npm run smoke:check -- --worker`
- lane-specific tests

## Cost controls

- Prefer local Codex/home PC for code execution instead of paid cloud runners.
- Keep GitHub Actions workflows small and use concurrency to cancel stale runs.
- Avoid artifact uploads unless needed.
- Avoid high-volume Worker logs; log structured summaries only.
- Keep polling interval conservative if a local polling loop is added.
- Do not add paid SaaS orchestrators by default.

## Observability

Minimum logs:

- selected task id
- lane/risk
- branch/worktree
- changed files
- checks run
- PR URL
- stop reason

GitHub evidence:

- issue `#23` or command issue status comment
- PR body KOHEE_STATUS block
- audit log update when appropriate

## Failure behavior

On failure, Local Codex must:

- stop after the current task
- not retry indefinitely
- record error summary
- leave worktree/branch visible
- open PR only if useful, otherwise report HOLD/FIX_REQUIRED

## Phase 5 completion criteria

Phase 5 is complete when:

- Local Codex can pick the next eligible task from GitHub state.
- It can run one LOW task through PR creation without long pasted prompts.
- It refuses HIGH/HOLD tasks.
- It records evidence consistently.
- It can be operated from iPhone/iPad by using GitHub/ChatGPT plus remote access only when needed.

## Local Codex starting prompt for Phase 5A

```text
작업 시작해. docs/PHASE5_LOCAL_CODEX_WORKER_DESIGN.md 기준으로 Phase 5A local worker runbook hardening만 진행해. 자동 실행/daemon/polling은 만들지 말고, 로컬 prerequisites, worktree/task-pick/stop 조건, 비용/로그/kill switch 기준을 문서화해. D1/schema/auth/CSV/public data/deploy/secrets/branch delete/issue close/direct merge bot은 건드리지 마라. 완료 후 PR을 열고 LOCAL_CODEX_AUDIT_LOG.md와 issue #23에 Status / Changed files / Tests / Remaining risks / Next action / Evidence 형식으로 보고해.
```
