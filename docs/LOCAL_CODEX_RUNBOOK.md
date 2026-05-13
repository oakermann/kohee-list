# Local Codex Runbook

Status: active Phase 5A local execution readiness contract

Purpose: define how Local Codex selects, executes, reports, and stops work while the active lane is `AUTOMATION_PLATFORM`.

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

Local Codex should run serially by default during Phase 5A.

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
