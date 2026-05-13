# Local Codex Runbook

Status: active Phase 5A/5B/5C/5D/5E local execution readiness contract

Purpose: define how Local Codex selects, executes, reports, verifies, and stops work while the active lane is `AUTOMATION_PLATFORM`.

## Read order

Always read in this order:

1. `AGENTS.md`
2. `docs/QUEUE_ROUTER.md`
3. The active queue named by the router. While the active lane is `AUTOMATION_PLATFORM`, this is `docs/queues/AUTOMATION_PLATFORM.md`.
4. issue `#23` latest automation comments
5. open PRs, review threads, and check logs relevant to the selected task
6. `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` only for grouping/order context
7. `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md` only for backlog/hardening context
8. `docs/KOHEE_MASTER_CONTEXT.md` and `kohee.contract.json` only when policy/risk is unclear

Do not use `docs/KOHEE_ACTIVE_QUEUE.md` as the active source. Legacy queue files are compatibility redirects only.

## Phase 5A worker contract

Local Codex must follow this contract for every eligible task:

1. Router check: confirm `docs/QUEUE_ROUTER.md` still says `AUTOMATION_PLATFORM`.
2. Queue check: confirm `docs/queues/AUTOMATION_PLATFORM.md` contains the next active task.
3. Blocker check: inspect issue `#23`, open PRs, unresolved review threads, failed checks, and explicit HOLD notes.
4. Task pick: select exactly one task unless the active queue explicitly permits parallel work.
5. Risk check: classify as LOW, MEDIUM, HIGH, or HOLD before editing.
6. Scope check: list expected files and forbidden areas before editing.
7. Branch/worktree: use one branch/worktree per task.
8. Minimal patch: change only the expected files.
9. Validation: run the required checks for the task.
10. Evidence report: report PR URL, head SHA, changed files, checks, review threads, issue state, and blocker status.
11. Stop: stop after PR/report. Do not silently continue to a second task.

## Task-pick decision table

| Condition | Action |
| --- | --- |
| Active router lane is not `AUTOMATION_PLATFORM` | HOLD and report current router state. |
| Open PR has unresolved review threads for the same lane | Work only that PR or HOLD. |
| Required check is failing on an active PR | Fix that PR before selecting new work. |
| issue `#23` records a current blocker | Work only that blocker or HOLD. |
| Task touches product queue while automation lane is active | HOLD unless owner/ChatGPT explicitly deferred the lane. |
| Task touches D1/schema/migrations, auth/session, CSV import/reset, public `/data`, deploy credentials, or production settings | HOLD unless explicitly approved and scoped. |
| Task touches dependency/package/lockfile/install-script behavior | Treat as at least MEDIUM; require explicit risk note. |
| Task is docs/schema/design-only and matches active queue | Eligible LOW/MEDIUM depending on file scope. |
| Task is unclear or spans multiple risk areas | Split, ask owner/ChatGPT, or HOLD. |

## Phase 5B dry-run picker plan

A dry-run picker is a selection simulation. It chooses and reports the next eligible task without editing files, creating branches, opening PRs, merging, deploying, or closing issues.

Inputs:

1. `docs/QUEUE_ROUTER.md`
2. `docs/queues/AUTOMATION_PLATFORM.md`
3. issue `#23` latest automation comments
4. open PR list
5. unresolved review threads
6. latest check status for active PRs
7. changed-file risk rules from `AGENTS.md` and this runbook

Dry-run picker steps:

1. Confirm active lane and active queue.
2. List recorded blockers from issue `#23`, open PRs, failed checks, and unresolved review threads.
3. List candidate tasks from the active queue only.
4. Reject product work unless the automation lane was explicitly deferred.
5. Assign each candidate a risk level: LOW, MEDIUM, HIGH, or HOLD.
6. Record expected files and forbidden areas for each candidate.
7. Reject candidates that overlap files, shared tests, workflow risk, or high-risk areas.
8. Pick the safest next serial task.
9. If no safe task exists, report HOLD with blocker evidence.
10. Output a dry-run report and stop.

Dry-run picker output table:

| Field | Meaning |
| --- | --- |
| Candidate | Short task name from active queue. |
| Source | Queue section or issue/PR source. |
| Risk | LOW, MEDIUM, HIGH, or HOLD. |
| Expected files | Files likely to change if executed. |
| Forbidden areas | Areas that must not change. |
| Blockers | Open PRs, failed checks, owner approval, or unclear scope. |
| Decision | PICK, SKIP, FIX_REQUIRED, or HOLD. |
| Evidence | PR/check/issue/queue evidence supporting the decision. |

Dry-run decision meanings:

- `PICK`: safe next serial task.
- `SKIP`: valid task but not next because another blocker or higher-priority queue item comes first.
- `FIX_REQUIRED`: existing PR/check/review must be fixed before new work.
- `HOLD`: owner/ChatGPT approval or clearer scope is required.

Dry-run report template:

```text
Status:
Blocker:
Next action:
Evidence:
- active lane:
- active queue:
- candidate count:
- picked candidate:
- risk:
- expected files:
- forbidden areas:
- checks reviewed:
- review threads:
- issue state:
- blocker status:
```

Dry-run hard stops:

- Do not edit files.
- Do not create branches.
- Do not open PRs.
- Do not merge.
- Do not deploy.
- Do not close issues.
- Do not enable unattended loop or auto-merge.

## Phase 5C GitHub evidence validator plan

The GitHub evidence validator is the required decision checklist for ChatGPT/owner merge decisions. It validates what actually exists on GitHub before any MERGE / FIX / HOLD / NEXT call.

Required evidence inputs:

| Evidence field | Required source |
| --- | --- |
| PR URL and number | GitHub PR metadata |
| head SHA | GitHub PR metadata |
| base branch and base SHA | GitHub PR metadata |
| changed files | GitHub PR changed files list |
| checks | GitHub Actions workflow runs/jobs for the head SHA |
| review threads | GitHub review thread API, including resolved/outdated state |
| comments | PR conversation and review comments when relevant |
| issue state | issue `#23` and any linked blocker issue when relevant |
| queue/lane match | `docs/QUEUE_ROUTER.md` and `docs/queues/AUTOMATION_PLATFORM.md` |
| forbidden-area check | changed files plus risk rules from this runbook |

Validation steps:

1. Confirm the PR is open unless checking a completed merge.
2. Confirm head SHA in the report matches GitHub PR metadata.
3. Confirm active lane and active queue still match the PR purpose.
4. Confirm changed files are expected for the task.
5. Confirm no forbidden area was touched without explicit owner/ChatGPT approval.
6. Confirm required checks are complete and successful, or record the exact failed/pending check.
7. Confirm review threads are resolved or explicitly waived.
8. Confirm issue blockers are absent, resolved, or intentionally routed around.
9. Confirm the PR does not enable unattended loop, native auto-merge, direct merge bot behavior, deployment, D1/schema/migration, auth/session, CSV import/reset, or public `/data` changes unless explicitly approved.
10. Produce a decision: MERGE, FIX, HOLD, or NEXT.

Decision rules:

| Decision | Required condition |
| --- | --- |
| MERGE | Active queue/lane match, expected files only, required checks success, review threads resolved, no unapproved forbidden areas, not HIGH/HOLD. |
| FIX | Scope is acceptable but checks, docs, wording, evidence, or review feedback need a concrete fix. |
| HOLD | Evidence is missing, risk is HIGH/HOLD, forbidden areas changed, owner approval is required, or the lane/queue does not match. |
| NEXT | PR is already merged/closed with a clear follow-up and the active queue can safely advance. |

Evidence validator report template:

```text
Status:
Blocker:
Next action:
Evidence:
- PR URL:
- PR number:
- base branch:
- base SHA:
- head branch:
- head SHA:
- changed files:
- expected files only:
- forbidden areas touched:
- checks:
- review threads:
- comments:
- issue state:
- active lane:
- active queue:
- decision:
```

Validator hard stops:

- Do not rely on Codex self-report without GitHub metadata.
- Do not treat missing checks as success.
- Do not treat outdated unresolved review feedback as resolved unless the thread is resolved or clearly superseded and owner/ChatGPT waives it.
- Do not merge if head SHA moved after evidence collection.
- Do not merge if changed files include unapproved D1/schema/migration, auth/session, CSV import/reset, public `/data`, production deployment, credential, or dependency/install-script changes.

## Phase 5D low/medium PR exercise loop plan

The low/medium PR exercise loop proves the Phase 5A/5B/5C rules using real PRs before stronger automation is considered.

Purpose:

- Run at least three real LOW/MEDIUM PRs through the evidence-based MERGE / FIX / HOLD / NEXT flow.
- Prove the dry-run picker can identify safe candidates.
- Prove the evidence validator can block incomplete or risky PRs.
- Prove ChatGPT/owner decisions use GitHub evidence instead of Codex self-report.
- Keep unattended loop, auto-merge, direct merge bot behavior, and product work disabled.

Allowed exercise PRs:

| Exercise type | Allowed scope | Risk |
| --- | --- | --- |
| Docs sync | Queue/runbook/reporting wording only | LOW |
| Validator/check update | `scripts/check-queue-docs.mjs` or docs-only checks | LOW/MEDIUM |
| Audit-only note | Read-only audit doc or issue comment only | LOW |
| Evidence template update | Report template or checklist wording | LOW |

Forbidden exercise PRs:

- Product features or UI changes.
- D1/schema/migration changes.
- Auth/session/security behavior changes.
- CSV import/reset changes.
- public `/data` behavior changes.
- Production deploy, credential, or environment changes.
- Dependency/package/lockfile/install-script behavior changes unless explicitly scoped as MEDIUM and owner/ChatGPT-approved.
- Unattended loop, native auto-merge, direct merge bot behavior, issue close automation, or branch deletion.

Exercise loop steps for each PR:

1. Run the dry-run picker and record the selected candidate.
2. Confirm expected files and forbidden areas.
3. Open or inspect the exercise PR.
4. Collect GitHub evidence: PR URL, PR number, head SHA, changed files, checks, review threads, comments, issue state, active lane, active queue.
5. Apply the evidence validator decision rules.
6. Return exactly one decision: MERGE, FIX, HOLD, or NEXT.
7. If FIX, apply the smallest safe fix and repeat evidence validation.
8. If HOLD, stop and record the blocker.
9. If MERGE, merge only after required checks pass and review threads are resolved or explicitly waived.
10. Record result and move to the next exercise only after the current one is closed.

Exercise result ledger template:

| Field | Required value |
| --- | --- |
| Exercise number | 1, 2, or 3+ |
| PR URL | GitHub PR URL |
| head SHA | Head SHA at decision time |
| changed files | Changed file list |
| checks | Pass/fail/pending result |
| review threads | Resolved/unresolved/outdated summary |
| decision | MERGE, FIX, HOLD, or NEXT |
| result | merged, fixed, held, or skipped |
| follow-up | next action or none |

Completion criteria:

- At least three LOW/MEDIUM exercise PRs have completed.
- At least one exercise includes a real evidence validation before merge.
- Any FIX/HOLD path records the blocker and next action.
- No exercise touches forbidden areas without approval.
- No auto-merge or unattended loop is enabled.

## Phase 5E approval and notification readiness

Approval and notification readiness defines when stronger behavior may be proposed, how approval is requested, and what must remain HOLD.

Approval notification bridge:

| Situation | Notification target | Required content |
| --- | --- | --- |
| HOLD needs owner decision | issue `#23` or target PR comment | Status, blocker, next action, evidence, approval question |
| FIX_REQUIRED blocks merge | target PR comment | failed check/review/thread evidence and smallest fix path |
| Stronger behavior is proposed | owner/ChatGPT in active automation lane | exact behavior, risk, rollback, required approvals, disable path |
| Maturity gate decision needed | issue `#23` plus active queue update | completed evidence, remaining HOLD list, go/no-go recommendation |

Owner approval pack template:

```text
Status:
Blocker:
Next action:
Evidence:
- request type:
- proposed behavior:
- current default:
- risk level:
- files/settings affected:
- checks required:
- rollback/disable path:
- explicit approval needed:
```

Native auto-merge approval pack:

- Remains HOLD by default.
- Requires at least three completed low/medium exercise PRs.
- Requires required checks and review-thread policy to be proven.
- Requires rollback/disable path.
- Requires explicit owner/ChatGPT approval before enabling.

Local controlled worker loop approval pack:

- Remains HOLD by default.
- Must be dry-run first.
- Must process one task at a time unless explicitly approved.
- Must stop on any HOLD, FIX_REQUIRED, failed check, unresolved review thread, or head-SHA change.
- Must not merge, deploy, close issues, delete branches, or enable auto-merge unless separately approved.

Notification readiness hard stops:

- Do not request approval without evidence.
- Do not imply approval from silence.
- Do not bundle unrelated approval requests.
- Do not turn approval packs into implementation.
- Do not enable stronger behavior in the same PR that only documents the approval pack.

## Stop conditions

Stop and report instead of continuing when any of these occur:

- Router/queue mismatch.
- Open PR or issue blocker conflicts with the selected task.
- The task requires product work while `AUTOMATION_PLATFORM` is active.
- The task requires D1/schema/migration, auth/session, CSV import/reset, public `/data`, production deploy, credential, or branch-protection changes without explicit approval.
- The patch needs files outside the expected scope.
- The diff grows beyond the intended task.
- A required check fails and the cause is unclear.
- Review feedback changes risk level or file scope.
- A package/dependency/lockfile/install-script change appears unexpectedly.
- Git push, PR creation, or CI status cannot be verified from GitHub evidence.
- The task would require unattended loop, native auto-merge, direct merge bot behavior, issue close automation, or branch deletion.

Stop reports must use:

```text
Status / Blocker / Next action / Evidence
```

## Evidence report template

Use this template for PRs, issue comments, and owner/ChatGPT handoff:

```text
Status:
Blocker:
Next action:
Evidence:
- PR URL:
- head SHA:
- changed files:
- checks:
- review threads:
- issue state:
- blocker status:
```

For implementation-heavy work, add `Tests` and `Remaining risks`, but keep the required evidence fields.

## Operating default

Local Codex should run serially by default during Phase 5A/5B/5C/5D/5E.

Parallel LOW work is allowed only when all of the following are true:

- No recorded blocker is active.
- The active queue explicitly allows parallel work.
- Tasks do not touch the same file, same shared test file, same workflow, or same risk area.
- No task is HIGH/HOLD.
- No task touches D1/schema/migrations, auth/session, CSV import/reset, public `/data`, deploy credentials, production settings, dependency/package/lockfile/install-script behavior, or GitHub App control-plane connection.

If independence is unclear, fall back to one task.

## Local workflow per lane

1. Inspect router, active queue, target issue/PR, and relevant check logs.
2. Confirm lane/risk and allowed file scope.
3. Create a dedicated worktree and branch.
4. Fix only the recorded task.
5. Run verification appropriate to that lane.
6. Commit and push to the target branch.
7. Open a scoped PR.
8. Record a short result in `docs/audits/LOCAL_CODEX_AUDIT_LOG.md` when applicable.
9. Add a short status comment to the target PR or issue `#23`.
10. Stop that lane after PR/report.

## Parallel safety rules

Allowed parallel candidates:

- audit-only docs
- governance docs
- read-only tooling audit
- dependency/observability audit only when not changing package/lockfile/install-script behavior
- test-only changes that do not share the same test file

Do not run in parallel when any candidate touches:

- the same file path
- `package.json`, lockfiles, package manager config, or install scripts
- shared test scripts at the same time
- `.github/workflows/**` at the same time
- `automation/github-app-worker/**` at the same time
- `server/**`
- `assets/**` and `.pages-deploy/**`
- CSV import/reset logic
- auth/session/security logic
- D1/schema/migrations
- deploy credentials or production settings

If two tasks would both require `npm run test:unit` changes in the same shared file, split them serially.

## Guardrails

Do not change D1 migrations, `schema.sql`, `migrations/**`, auth/session/security behavior, public `/data` exposure rules, CSV import/reset semantics, production deploy credentials, branch deletion, issue close automation, direct merge bot behavior, native auto-merge enablement, or unattended loop behavior without explicit approval.

## Checks

Default checks:

- `npm run check:deploy-sync`
- `npm run check:queue-docs`
- `npm run test:unit`
- `npm run audit:kohee`
- `git diff --check`

Add when needed:

- `npm run verify:release`
- `npm run format:check`
- `npm run smoke:check -- --worker`
- `npm run smoke:check -- --pages`
- lane-specific tests

## Smoke command choices

Use the least invasive smoke command that proves the current task.

| Command | Default use | Approval needed |
| --- | --- | --- |
| `npm run smoke:check -- --worker` | Read-only Worker `/health`, `/health/db`, `/version`, and public `/data` smoke | No, but live network access may require local/escalated permission |
| `npm run smoke:check -- --pages` | Read-only Pages home/admin HTML smoke | No, but live network access may require local/escalated permission |
| `npm run smoke:check` | Read-only Pages + Worker smoke | No, but live network access may require local/escalated permission |
| `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Mode full` | Manual end-to-end production-adjacent smoke only | Yes. This can mutate remote D1 data, promote temporary users, create records, update notice text, and then attempt cleanup |

Do not run destructive or production-adjacent smoke by default. If a full smoke is needed, record the reason, target environment, cleanup expectation, and user approval before running it.

## Overnight prompt

Use this only when the owner explicitly asks for unattended night work without enabling a daemon:

```text
AGENTS.md, docs/QUEUE_ROUTER.md, docs/queues/AUTOMATION_PLATFORM.md, docs/LOCAL_CODEX_RUNBOOK.md 기준으로 병렬 가능한 LOW LOCAL_TRACK 작업을 최대 2개까지 독립 worktree로 진행해.

조건:
- 먼저 issue #23, open PR, unresolved review thread, failed check, active queue blocker를 확인해. 기록된 blocker가 있으면 병렬 작업을 시작하지 말고 그 blocker만 처리하거나 HOLD 보고해.
- 각 작업은 별도 worktree/branch/PR로 분리
- 같은 파일/같은 공유 테스트/같은 workflow/같은 risk area를 건드리면 병렬 중단 후 1개만 진행
- MEDIUM은 명확히 scoped된 경우만 단독 진행
- HIGH/HOLD 작업은 구현하지 말고 HOLD 보고
- D1/schema/migrations, auth/session/security, CSV import/reset, public /data, production deploy/credentials, branch delete, issue close, direct merge bot, native auto-merge, unattended loop enablement은 금지
- PR 생성 후 merge하지 말고 멈춤
- 실패하면 반복 재시도하지 말고 FIX_REQUIRED 또는 HOLD 보고
- 각 PR과 issue #23에 Status / Blocker / Next action / Evidence 형식으로 보고
```

## Result format

Status / Blocker / Next action / Evidence
