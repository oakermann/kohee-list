# Phase 3 Safe Issue-Comment Bridge Design

Status: design-first / no production writes
Date: 2026-05-12
Owner: ChatGPT design, Local Codex implementation
Lane: GOVERNANCE / DEPLOY_SAFETY
Risk: MEDIUM by default, HIGH if writes are broadened

## Goal

Phase 3 turns the dry-run GitHub App Worker from a passive webhook receiver into a narrowly scoped status bridge for KOHEE maintenance operations.

It must not become a merge bot, branch deletion bot, issue closer, deployment controller, or ruleset bypass.

The first implementation target is safe parsing and recording of KOHEE status comments from issue `#23` and allowed command issues.

## Current baseline

Already completed before Phase 3 implementation:

- GitHub App webhook delivery reaches the dry-run Worker.
- `issue_comment.created` deliveries return `ok=true` and `dryRun=true`.
- The Worker can emit dry-run decisions such as `decision=OBSERVE` and `wouldDo=["record_status"]`.
- Command dispatch is create-only/no-overwrite.
- Command validator exists and is covered by tests.
- Scheduled maintenance has been narrowed to read-only audit behavior.

## Non-goals

Phase 3 must not implement:

- direct merge bot behavior
- issue closing
- remote branch deletion
- D1/schema/migration actions
- Cloudflare production deploy control
- secret writes or rotation
- CSV import/reset behavior
- public `/data` behavior changes
- auth/session/security policy changes
- native auto-merge enablement
- bypass of GitHub Actions, required checks, reviews, or rulesets

## Event scope

Allowed first event:

- `issue_comment.created`

Allowed repositories:

- `oakermann/kohee-list` only

Allowed issue targets:

- issue `#23` maintenance control issue
- later: command issues explicitly created by the command dispatch workflow

Ignored events:

- `workflow_run` remains OBSERVE-only unless a later design says otherwise
- `pull_request` remains OBSERVE-only in Phase 3
- all other events return a safe OBSERVE decision

## Accepted comment inputs

The Worker may parse comments containing a clear status marker that uses the current canonical `KOHEE_STATUS` vocabulary from `docs/CODEX_WORKFLOW.md`, `.github/ISSUE_TEMPLATE/kohee_task.md`, and `scripts/validate-kohee-command.mjs`.

Accepted status values must be reused from the shared schema unless that shared schema is updated first:

- `state`: `QUEUED`, `QUEUED_STALE`, `WORKING`, `PR_OPEN`, `REVIEWING`, `FIXING`, `DEPLOYING`, `MERGED_AND_DEPLOYED`, `DONE_NO_DEPLOY`, `HOLD`
- `risk`: `LOW`, `MEDIUM`, `HIGH`
- `lane`: `GOVERNANCE`, `DEPLOY_SAFETY`, `PUBLIC_EXPOSURE`, `AUTH_ROLE`, `LIFECYCLE`, `CSV_PIPELINE`, `FRONTEND_RENDERING`
- `blocker`: `HOLD_HIGH_RISK`, `HOLD_USER_APPROVAL`, `HOLD_DEPLOY_BLOCKED`, `HOLD_SECRET_OR_PERMISSION`, `HOLD_PRODUCT_DIRECTION`, `HOLD_SCOPE_CONFLICT`, `HOLD_VERIFICATION_CONFLICT`, `HOLD_REPEATED_FAILURE`, `HOLD_CODEX_NO_RESPONSE`, `HOLD_CODEX_PR_PUBLISHING`

Example:

```yaml
KOHEE_STATUS:
  state: PR_OPEN | REVIEWING | FIXING | DONE_NO_DEPLOY | HOLD
  risk: LOW | MEDIUM | HIGH
  lane: GOVERNANCE | DEPLOY_SAFETY | FRONTEND_RENDERING | CSV_PIPELINE | AUTH_ROLE
  blocker: HOLD_HIGH_RISK | HOLD_USER_APPROVAL | HOLD_SCOPE_CONFLICT
  active_pr: https://github.com/oakermann/kohee-list/pull/123
  head_sha: abc123
  evidence:
    pr_url: https://github.com/oakermann/kohee-list/pull/123
    notes: short text or URL
```

The Worker must reject or ignore ambiguous comments without the `KOHEE_STATUS:` marker.

The Worker must not introduce Phase 3-only `KOHEE_STATUS` states or lanes such as `FIX_REQUIRED`, `MERGED`, `NEXT_READY`, `AUTOMATION_CONNECTIVITY`, or `SUPPLY_CHAIN` unless the shared schema and validator are updated in the same approved change.

## State machine

Recommended Phase 3 states:

- `OBSERVE`: event parsed but no accepted status marker
- `RECORD_STATUS_DRY_RUN`: accepted marker, bot writes disabled, would record status
- `RECORD_STATUS`: accepted marker, bot writes enabled for status comment only
- `HOLD`: marker or detected risk requires human review
- `REJECT`: malformed marker, wrong repo, wrong issue, unsupported state, or unsafe request

## First implementation behavior

Phase 3A should stay dry-run only:

- parse `KOHEE_STATUS` blocks
- validate schema using existing command/status vocabulary where possible
- classify risk/lane/state
- emit structured `dryRunLog`
- add tests for accepted/rejected comments
- update docs and issue #23 report format
- do not write to GitHub

Phase 3B may enable one narrow write after explicit approval:

- write a status summary comment to issue #23 only
- no issue close
- no labels unless separately approved
- no PR merge/auto-merge
- no branch deletion
- no check status publishing unless separately approved

## Required guards

The implementation must include guards for:

- repository allowlist
- issue allowlist
- comment marker detection
- strict state/risk/lane vocabulary
- canonical `KOHEE_STATUS` vocabulary shared with command templates and validators
- PR URL must belong to `oakermann/kohee-list`
- PR number must be parseable when provided
- HIGH or HOLD states must never trigger follow-up writes beyond safe recording
- bot must remain disabled by default
- dry-run must remain enabled by default
- logs must include delivery ID, event, action, actor, repo, issue number, decision, wouldDo, reasons

## Test requirements

Add or update tests for:

- valid `KOHEE_STATUS` on #23 returns `RECORD_STATUS_DRY_RUN` while dry-run is true
- comment without marker returns `OBSERVE`
- unsupported repo returns `REJECT` or `OBSERVE` with reason
- unsupported issue returns `REJECT` or `OBSERVE` with reason
- malformed risk/lane/state returns `REJECT`
- HIGH/HOLD status does not attempt writes
- bot disabled means no GitHub write calls
- dry-run enabled means no GitHub write calls

## Files likely involved

Expected Phase 3A files:

- `automation/github-app-worker/src/index.mjs`
- `automation/github-app-worker/test/dry-run.test.mjs`
- `automation/github-app-worker/test/fixtures.test.mjs`
- `scripts/validate-kohee-command.mjs` only if shared vocabulary should be reused
- `docs/KOHEE_ACTIVE_QUEUE.md`
- `docs/audits/LOCAL_CODEX_AUDIT_LOG.md`

Do not touch unless explicitly required:

- `server/**`
- `assets/**`
- `.pages-deploy/**`
- `schema.sql`
- `migrations/**`
- production deploy workflows/secrets

## PR plan

### PR 1: Phase 3A dry-run parser and tests

Risk: MEDIUM

Scope:

- parse/validate KOHEE_STATUS issue comments
- return structured dry-run decisions
- tests only against local fixtures
- no GitHub writes

Merge condition:

- PR Validate and Validate pass
- no review threads open
- Worker remains dry-run by default

### PR 2: Phase 3A queue/report docs

Risk: LOW

Scope:

- document accepted KOHEE_STATUS schema
- document operator workflow
- update ACTIVE_QUEUE after PR 1

### PR 3: Phase 3B status comment write gate, only after explicit approval

Risk: HIGH until approved

Scope:

- one narrow write: status summary comment on #23 or allowed command issue
- bot write disabled by default
- tests prove no merge/close/delete/label/deploy behavior exists

## Phase 4 dependency

Phase 4 native auto-merge must not begin until Phase 3A is merged and stable.

Phase 4 design must rely on GitHub native auto-merge and required checks, not direct merge API calls from the Worker.

## Local Codex starting prompt

Use this for the first implementation task:

```text
작업 시작해. docs/PHASE3_SAFE_ISSUE_COMMENT_BRIDGE.md 기준으로 Phase 3A dry-run parser and tests만 구현해. GitHub writes, issue close, branch delete, merge, auto-merge, deploy, secrets, D1/schema, auth/session, CSV, public /data는 절대 건드리지 마라. Worker는 dry-run 기본값 유지. 완료 후 PR을 열고 LOCAL_CODEX_AUDIT_LOG.md와 issue #23에 Status / Changed files / Tests / Remaining risks / Next action / Evidence 형식으로 보고해.
```
