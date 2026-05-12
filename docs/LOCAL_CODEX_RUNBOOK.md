# Local Codex Runbook

Status: active routing note

## Read order

1. `AGENTS.md`
2. `docs/KOHEE_ACTIVE_QUEUE.md`
3. issue `#23` latest comments
4. open PRs and check logs
5. `docs/KOHEE_MASTER_CONTEXT.md` only when policy/risk is unclear

## Operating default

Local Codex should prefer **parallel independent LOW lanes** instead of serial one-task operation.

Default behavior:

- Pick up to 2 independent LOW tasks from `docs/KOHEE_ACTIVE_QUEUE.md` when safe.
- Use one git worktree and one branch per task.
- Open one scoped PR per task.
- Do not merge PRs.
- Stop each lane after opening its PR or reporting FIX_REQUIRED/HOLD.

Parallel work is allowed only when tasks do not touch the same file, same shared test file, same workflow, or same risk area.

If independence is unclear, fall back to one task.

## Current task selection

Use `docs/KOHEE_ACTIVE_QUEUE.md` as the source of truth.

Do not use stale historical tasks from this runbook as the first task. This file defines the local operating method; the active queue defines the current work.

Current preferred pattern:

1. Identify the next LOW `LOCAL_TRACK` tasks.
2. Group independent audit/docs/tooling tasks into parallel worktrees when safe.
3. Keep MEDIUM tasks separate unless explicitly scoped.
4. HOLD all HIGH/HOLD tasks and report instead of implementing.

## Local workflow per lane

1. Inspect active queue, target issue/PR, and relevant check logs.
2. Confirm lane/risk and allowed file scope.
3. Create a dedicated worktree and branch.
4. Fix only the recorded task.
5. Run verification appropriate to that lane.
6. Commit and push to the target branch.
7. Open a scoped PR.
8. Record a short result in `docs/audits/LOCAL_CODEX_AUDIT_LOG.md` when applicable.
9. Add a short status comment to the target PR or issue `#23`.
10. Stop that lane after PR/report. Do not continue to another task inside the same lane unless explicitly asked.

## Parallel safety rules

Allowed parallel candidates:

- audit-only docs
- governance docs
- read-only tooling audit
- dependency/observability audit
- test-only changes that do not share the same test file

Do not run in parallel when any candidate touches:

- the same file path
- `package.json` or shared test scripts at the same time
- `.github/workflows/**` at the same time
- `automation/github-app-worker/**` at the same time
- `server/**`
- `assets/**` and `.pages-deploy/**`
- CSV import/reset logic
- auth/session/security logic
- D1/schema/migrations
- deploy/secrets

If two tasks would both require `npm run test:unit` changes in the same shared file, split them serially.

## Guardrails

Do not change D1 migrations, `schema.sql`, `migrations/**`, auth/session/security behavior, public `/data` exposure rules, CSV import/reset semantics, production deploy/secrets, branch deletion, issue close automation, direct merge bot behavior, or native auto-merge enablement without explicit approval.

## Checks

Default checks:

- `npm run check:deploy-sync`
- `npm run test:unit`
- `npm run audit:kohee`
- `git diff --check`

Add when needed:

- `npm run verify:release`
- `npm run smoke:check -- --worker`
- `npm run smoke:check -- --pages`
- lane-specific tests

## Smoke command choices

Use the least invasive smoke command that proves the current task.

| Command                                                                        | Default use                                                                    | Approval needed                                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run smoke:check -- --worker`                                              | Read-only Worker `/health`, `/health/db`, `/version`, and public `/data` smoke | No, but live network access may require local/escalated permission                                                         |
| `npm run smoke:check -- --pages`                                               | Read-only Pages home/admin HTML smoke                                          | No, but live network access may require local/escalated permission                                                         |
| `npm run smoke:check`                                                          | Read-only Pages + Worker smoke                                                 | No, but live network access may require local/escalated permission                                                         |
| `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Mode full` | Manual end-to-end production-adjacent smoke only                               | Yes. This can mutate remote D1 data, promote temporary users, create records, update notice text, and then attempt cleanup |

Do not run destructive or production-adjacent smoke by default. If a full smoke
is needed, record the reason, target environment, cleanup expectation, and user
approval before running it.

## Overnight prompt

Use this when the owner wants unattended night work without enabling a daemon:

```text
AGENTS.md, docs/KOHEE_ACTIVE_QUEUE.md, docs/LOCAL_CODEX_RUNBOOK.md 기준으로 병렬 가능한 LOW LOCAL_TRACK 작업을 최대 2개까지 독립 worktree로 진행해.

조건:
- 각 작업은 별도 worktree/branch/PR로 분리
- 같은 파일/같은 공유 테스트/같은 workflow/같은 risk area를 건드리면 병렬 중단 후 1개만 진행
- MEDIUM은 명확히 scoped된 경우만 단독 진행
- HIGH/HOLD 작업은 구현하지 말고 HOLD 보고
- D1/schema/migrations, auth/session/security, CSV import/reset, public /data, production deploy/secrets, branch delete, issue close, direct merge bot, native auto-merge enablement은 금지
- PR 생성 후 merge하지 말고 멈춤
- 실패하면 반복 재시도하지 말고 FIX_REQUIRED 또는 HOLD 보고
- 각 PR과 issue #23에 Status / Changed files / Tests / Remaining risks / Next action / Evidence 형식으로 보고
```

## Result format

Status / Changed files / Tests / Remaining risks / Next action / Evidence
