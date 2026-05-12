# Phase 4 Native Auto-Merge Design

Status: design-first / do not enable writes yet
Date: 2026-05-12
Owner: ChatGPT design, Local Codex implementation
Lane: AUTOMATION_CONNECTIVITY / DEPLOY_SAFETY
Risk: HIGH until Phase 3 is proven and owner explicitly approves enablement

## Goal

Phase 4 lets safe LOW-risk PRs merge with less manual waiting, while keeping GitHub as the final gate.

The design uses GitHub native auto-merge or merge queue behavior. The Worker must not directly merge PRs and must not bypass branch protections, rulesets, required checks, or reviews.

## External baseline

GitHub auto-merge merges a PR only after required reviews and required status checks pass, and repository auto-merge must be enabled before individual PRs can use it.

GitHub branch protection/rulesets can enforce required status checks and other merge requirements.

GitHub merge queue can merge PRs after required checks pass on the queued branch state, but KOHEE should not adopt merge queue until normal native auto-merge is stable and useful.

## Prerequisites

Phase 4 must not start until all are true:

- Phase 3A dry-run parser/status bridge is merged and stable.
- `issue_comment.created` status bridge has tests and structured logs.
- GitHub Actions PR Validate and Validate are stable.
- command dispatch create-only/no-overwrite remains active.
- command validator remains in `npm run test:unit`.
- scheduled maintenance remains read-only.
- owner explicitly approves Phase 4 implementation.

## Non-goals

Phase 4 must not implement:

- direct PR merge API calls from the Worker
- branch protection/ruleset bypass
- admin bypass merge
- issue close automation
- remote branch deletion automation
- production deploy trigger automation
- D1/schema/migration actions
- secret writes or rotations
- CSV import/reset changes
- public `/data` behavior changes
- auth/session/security behavior changes

## Allowed first scope

Phase 4A should be audit/design only:

- inspect repository auto-merge setting state
- inspect required checks/ruleset/branch protection assumptions
- identify eligible LOW-risk PR classes
- define exact denylist
- do not enable auto-merge
- do not change repository settings

Phase 4B may add local tooling/tests:

- classify PR eligibility from local/GitHub metadata fixtures
- no GitHub writes
- prove HIGH/HOLD files are denied
- prove missing checks/reviews are denied

Phase 4C may enable native auto-merge only after explicit approval:

- enable auto-merge only on an eligible PR
- use GitHub native auto-merge behavior
- never call direct merge APIs
- never bypass required checks or reviews

## Eligible PR classes

Only PRs matching all conditions can be considered:

- risk: LOW
- mode: docs-only, tooling-only, audit-only, or test-only
- changed files avoid every HIGH/HOLD path
- PR body contains KOHEE_STATUS with risk/lane/mode/head_sha/evidence
- PR Validate and Validate are required by ruleset or branch protection
- no failing checks
- no unresolved review threads
- no merge conflicts
- no requested changes
- base branch is `main`
- head branch belongs to allowed owner/repo context
- PR is not draft

## Denied PR classes

Always deny auto-merge for PRs touching or implying:

- `schema.sql`
- `migrations/**`
- D1/schema/migration work
- `server/csv.js` import/reset semantics
- public `/data` behavior
- auth/session/security behavior
- production deploy workflows/secrets
- Cloudflare secrets or token changes
- GitHub App production write enablement
- issue close automation
- branch deletion automation
- direct merge bot fallback
- manager role expansion
- review-result CSV import/upload
- admin destructive behavior

## Decision states

Phase 4 classifier should emit:

- `AUTO_MERGE_OBSERVE`: no action; not enough info or not an auto-merge candidate
- `AUTO_MERGE_ELIGIBLE_DRY_RUN`: eligible but dry-run only
- `AUTO_MERGE_HOLD`: human approval required
- `AUTO_MERGE_REJECT`: denied due to risk/files/checks/reviews/state
- `AUTO_MERGE_ENABLE_NATIVE`: allowed only after explicit owner approval and implementation gate

## Worker behavior

Before approval:

- Worker remains dry-run.
- Worker may emit `wouldDo=["enable_native_auto_merge"]` for eligible LOW PRs.
- Worker must log all reasons and denied conditions.
- Worker must never write to GitHub.

After explicit approval:

- Worker may request native auto-merge for eligible LOW PRs only.
- Worker must not merge directly.
- Worker must not close issues.
- Worker must not delete branches.
- Worker must not change labels unless separately approved.
- Worker must not post custom commit statuses unless separately approved.

## GitHub Actions / ruleset requirements

Before enabling native auto-merge, verify:

- PR Validate is required or otherwise enforced for PRs.
- Validate is required or otherwise enforced for main/PR path.
- required check names are unique and non-ambiguous.
- branch protection/rulesets do not allow Worker bypass.
- repository allows auto-merge only as native GitHub behavior.
- auto-merge is disabled automatically when disallowed pushes occur per GitHub behavior.

## Test requirements

Add tests for classifier behavior:

- docs-only LOW PR with passing checks => `AUTO_MERGE_ELIGIBLE_DRY_RUN`
- draft PR => reject/observe
- PR with HIGH file path => `AUTO_MERGE_HOLD` or `AUTO_MERGE_REJECT`
- PR with D1 migration => reject
- PR with auth/server CSV sensitive path => reject
- PR with missing KOHEE_STATUS => observe
- PR with malformed risk/lane/mode => reject
- PR with failing check => reject
- PR with unresolved review thread => hold
- PR with merge conflict => reject
- dry-run mode performs no write calls

## Files likely involved

Phase 4A audit/design:

- `docs/PHASE4_NATIVE_AUTOMERGE_DESIGN.md`
- `docs/KOHEE_ACTIVE_QUEUE.md`
- `docs/audits/LOCAL_CODEX_AUDIT_LOG.md`

Phase 4B tests/tooling:

- `automation/github-app-worker/src/index.mjs`
- `automation/github-app-worker/test/dry-run.test.mjs`
- optional new `automation/github-app-worker/test/auto-merge-classifier.test.mjs`
- optional shared risk path helper under `automation/github-app-worker/src/`

Do not touch without explicit approval:

- `.github/workflows/deploy.yml`
- production deploy workflows/secrets
- `server/**`
- `assets/**`
- `.pages-deploy/**`
- `schema.sql`
- `migrations/**`

## PR plan

### PR 1: Phase 4 design doc and queue update

Risk: LOW

Scope:

- add this design
- queue Phase 4 after Phase 3
- no code behavior change

### PR 2: Phase 4A native auto-merge readiness audit

Risk: LOW audit-only

Scope:

- inspect settings/checks/ruleset assumptions from GitHub evidence
- report whether KOHEE can safely enable native auto-merge later
- no setting changes

### PR 3: Phase 4B classifier dry-run tests

Risk: MEDIUM

Scope:

- add dry-run classifier only
- no GitHub writes
- no auto-merge enablement

### PR 4: Phase 4C enable native auto-merge for LOW PRs only

Risk: HIGH until owner explicitly approves

Scope:

- use GitHub native auto-merge only
- no direct merge API
- no branch delete/issue close/deploy/secret behavior

## Rollback plan

If Phase 4 causes confusion or unsafe behavior:

- disable Worker write flag
- keep dry-run on
- disable repository auto-merge if needed
- revert Phase 4C only
- keep Phase 4A/B audit/classifier tests if useful

## Local Codex starting prompt for Phase 4A

```text
작업 시작해. docs/PHASE4_NATIVE_AUTOMERGE_DESIGN.md 기준으로 Phase 4A native auto-merge readiness audit만 진행해. GitHub repo settings/checks/ruleset 상태를 증거로 확인하고 보고서만 작성해. auto-merge 활성화, direct merge, branch delete, issue close, deploy, secrets, D1/schema, auth/session, CSV, public /data 변경은 절대 하지 마라. 완료 후 PR을 열고 LOCAL_CODEX_AUDIT_LOG.md와 issue #23에 Status / Changed files / Tests / Remaining risks / Next action / Evidence 형식으로 보고해.
```
