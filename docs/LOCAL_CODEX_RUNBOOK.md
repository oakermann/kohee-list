# Local Codex Runbook

Status: active project-factory Local Codex worker contract

Purpose: define how Local Codex consumes GitHub task packets, performs scoped local repo work, reports evidence, and stops while the active lane is `AUTOMATION_PLATFORM`.

## Constitutional priority

`docs/AUTOMATION_CONSTITUTION.md` wins over this runbook if there is any conflict.

Fixed operating model:

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> Codex Review/review threads -> automation decision -> merge or hold
```

Local Codex is the code worker, not the orchestrator and not the merge authority.

## Read order

Always read in this order:

1. `docs/AUTOMATION_CONSTITUTION.md`
2. `AGENTS.md`
3. `docs/QUEUE_ROUTER.md`
4. `docs/AUTOMATION_OPERATOR_RAIL.md`
5. The active queue named by the router. While the active lane is `AUTOMATION_PLATFORM`, this is `docs/queues/AUTOMATION_PLATFORM.md`.
6. The active `TASK_PACKET` from issue `#23` or the active GitHub task queue.
7. open PRs, failed checks, unresolved review threads, and relevant check logs.
8. `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` only for grouping/order context.
9. `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md` only for backlog/hardening context.
10. `docs/KOHEE_MASTER_CONTEXT.md` and `kohee.contract.json` only when policy/risk is unclear.

Do not use `docs/KOHEE_ACTIVE_QUEUE.md` as the active source. Legacy queue files are compatibility redirects only.

## Active worker contract

Local Codex must follow this contract for every routed task:

1. Constitution check: confirm the task does not conflict with `docs/AUTOMATION_CONSTITUTION.md`.
2. Router check: confirm `docs/QUEUE_ROUTER.md` still says `AUTOMATION_PLATFORM`.
3. Task packet check: read exactly one active `TASK_PACKET`.
4. Blocker check: inspect open PRs, failed checks, unresolved review threads, issue `#23`, and explicit HOLD notes.
5. Risk check: classify as LOW, MEDIUM, HIGH, or HOLD before editing.
6. Scope check: list expected files and forbidden areas before editing.
7. Branch/worktree: use one branch/worktree per task.
8. Minimal patch: change only the expected files.
9. Validation: run the required checks from the task packet.
10. Evidence report: report task id, project, PR URL, head SHA, changed files, checks, review threads, issue state, restricted areas touched, and merge policy.
11. Stop: stop after PR/report. Do not silently continue to a second task.

## TASK_PACKET input

Local Codex should expect the standard task packet shape:

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

If the task packet is missing, ambiguous, stale, or conflicts with an open PR, Local Codex must report HOLD or FIX_REQUIRED instead of inventing a task.

## Task-pick decision table

| Condition | Action |
| --- | --- |
| Active router lane is not `AUTOMATION_PLATFORM` | HOLD and report current router state. |
| No active `TASK_PACKET` exists | HOLD and request a task packet. |
| Open PR has unresolved review threads for the same lane | Work only that PR or HOLD. |
| Required check is failing on an active PR | Fix that PR before selecting new work. |
| issue `#23` records a current blocker | Work only that blocker or HOLD. |
| Task touches product queue while automation lane is active | HOLD unless owner/ChatGPT explicitly deferred the lane. |
| Task touches D1/schema/migrations, auth/session, CSV import/reset, public data behavior, deploy credentials, or production settings | HOLD unless explicitly approved and scoped. |
| Task touches dependency/package/lockfile/install-script behavior | Treat as at least MEDIUM; require explicit risk note. |
| Task is docs/schema/design-only and matches the task packet | Eligible LOW/MEDIUM depending on file scope. |
| Task is unclear or spans multiple risk areas | Split, ask owner/ChatGPT, or HOLD. |

## Merge policy

Local Codex does not merge.

LOW/MEDIUM may be auto-merged later by the automation layer only after every evidence gate passes:

- project profile allows LOW/MEDIUM auto-merge.
- changed files match the task packet.
- forbidden areas are absent.
- `PR Validate` succeeds.
- `Validate` succeeds.
- unresolved review threads are absent.
- Codex Review threads are resolved or explicitly waived.
- head SHA is stable.
- policy-risk result is LOW or approved MEDIUM.
- PR evidence is complete.

HIGH/HOLD never auto-merges. HIGH/HOLD requires explicit user approval.

## Evidence validator

Required evidence inputs:

| Evidence field | Required source |
| --- | --- |
| task_id | GitHub task packet |
| project | GitHub task packet / project profile |
| PR URL and number | GitHub PR metadata |
| head SHA | GitHub PR metadata |
| base branch and base SHA | GitHub PR metadata |
| changed files | GitHub PR changed files list |
| checks | GitHub Actions workflow runs/jobs for the head SHA |
| review threads | GitHub review thread API, including resolved/outdated state |
| issue state | issue `#23` and linked blocker issue when relevant |
| queue/lane match | `docs/QUEUE_ROUTER.md` and `docs/queues/AUTOMATION_PLATFORM.md` |
| forbidden-area check | task packet, project profile, and `scripts/policy-risk-report.mjs` |

Decision rules:

| Decision | Required condition |
| --- | --- |
| MERGE | Active task/lane match, expected files only, required checks success, review threads resolved, no unapproved forbidden areas, LOW/MEDIUM gate allowed. |
| FIX | Scope is acceptable but checks, docs, wording, evidence, or review feedback need a concrete fix. |
| HOLD | Evidence is missing, risk is HIGH/HOLD, forbidden areas changed, owner approval is required, or the lane/task packet does not match. |
| NEXT | PR is already merged/closed with a clear follow-up and the active queue can safely advance. |

## Stop conditions

Stop and report instead of continuing when any of these occur:

- Constitution/router/queue mismatch.
- Missing, stale, or conflicting `TASK_PACKET`.
- Open PR or issue blocker conflicts with the selected task.
- The task requires product work while `AUTOMATION_PLATFORM` is active.
- The task requires D1/schema/migration, auth/session, CSV import/reset, public data behavior, production deploy, credential, or branch-protection changes without explicit approval.
- The patch needs files outside the expected scope.
- The diff grows beyond the intended task.
- A required check fails and the cause is unclear.
- Review feedback changes risk level or file scope.
- A package/dependency/lockfile/install-script change appears unexpectedly.
- Git push, PR creation, or CI status cannot be verified from GitHub evidence.
- The task would require HIGH/HOLD auto-merge, unattended loop, direct merge bot behavior, issue close automation, or branch deletion.

Stop reports must use:

```text
Status / Blocker / Next action / Evidence
```

## Evidence report template

```text
Status:
Blocker:
Next action:
Evidence:
- task_id:
- project:
- PR URL:
- head SHA:
- changed files:
- checks:
- review threads:
- issue state:
- restricted areas touched:
- merge policy:
```

For implementation-heavy work, add `Tests` and `Remaining risks`, but keep the required evidence fields.

## Default checks

Use the checks in the task packet first.

Default fallback checks:

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

## Preserved Phase 5 references

The old Phase 5 material is preserved as background, not the active queue:

- Phase 5A worker contract: superseded by the Active worker contract above.
- Phase 5B dry-run picker plan: preserved as a selection simulation concept.
- Phase 5C GitHub evidence validator plan: preserved by the Evidence validator section above.
- Phase 5D low/medium PR exercise loop plan: completed baseline evidence exists and remains useful.
- Phase 5E approval and notification readiness: preserved for HOLD/FIX_REQUIRED reports and approval packs.

## Parallel safety rules

Parallel work is allowed only for LOW/MEDIUM tasks with no file overlap, no risk-area overlap, and no shared test-file overlap.

Do not run in parallel when any candidate touches:

- the same file path.
- `package.json`, lockfiles, package manager config, or install scripts.
- shared test scripts at the same time.
- `.github/workflows/**` at the same time.
- `automation/github-app-worker/**` at the same time.
- `server/**`.
- `assets/**` and `.pages-deploy/**`.
- CSV import/reset logic.
- auth/session/security logic.
- D1/schema/migrations.
- deploy credentials or production settings.

If independence is unclear, fall back to one task.

## Result format

Status / Blocker / Next action / Evidence
