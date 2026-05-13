# KOHEE LIST Agent Contract

Purpose: short entrypoint for ChatGPT, Cloudflare/GitHub App automation, and Local Codex.

## Supreme rule

- `docs/AUTOMATION_CONSTITUTION.md` is the top-level automation constitution.
- Read it before changing automation routing, queue, role split, merge policy, or project-factory architecture.
- If any automation document conflicts with the constitution, the constitution wins.
- Do not weaken or amend the constitution unless the user explicitly asks to change the automation constitution or top-level operating model.

## Current routing

The active lane is `AUTOMATION_PLATFORM` until the project-factory automation rail can safely manage product work or the owner/ChatGPT explicitly defers it for an urgent product bug.

Canonical active files:

- `docs/AUTOMATION_CONSTITUTION.md`: supreme automation contract.
- `docs/QUEUE_ROUTER.md`: active lane/router.
- `docs/AUTOMATION_OPERATOR_RAIL.md`: active project-factory operating rail.
- `docs/queues/AUTOMATION_PLATFORM.md`: active automation-platform execution queue.
- `docs/queues/KOHEE_PRODUCT.md`: paused KOHEE product queue. Do not start it while the automation lane is active unless explicitly deferred by the owner/ChatGPT.

Reference/backlog docs:

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`
- `docs/AUTOMATION_PLATFORM_6B*.md`
- `docs/AUTOMATION_PLATFORM_6C_MATURITY_GATE.md`
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`

## Codex anti-confusion rule

Use this file as the entrypoint, then follow the router and active queue. Do not scan old planning docs to choose work.

Priority order:

1. GitHub evidence blockers: open PRs, failed checks, unresolved review threads, and issue `#23` blockers.
2. `docs/QUEUE_ROUTER.md` for the active lane.
3. `docs/queues/AUTOMATION_PLATFORM.md` for the active execution order.
4. Issue `#23` task packets only when the active queue says to use them.
5. Reference/backlog docs only when the active queue or task packet explicitly names them.

Do not treat legacy queue files, old phase docs, audit logs, or reference/backlog docs as executable work unless the active queue explicitly promotes them.

## Fixed operating model

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> Codex Review/review threads -> automation decision -> merge or hold
```

## Read path

Always read:

1. `docs/AUTOMATION_CONSTITUTION.md`
2. `docs/QUEUE_ROUTER.md`
3. `docs/AUTOMATION_OPERATOR_RAIL.md`
4. If the router says `AUTOMATION_PLATFORM`, read `docs/queues/AUTOMATION_PLATFORM.md`
5. Current PR / issue / check logs relevant to the task

For local PC work, also read:

- `docs/LOCAL_CODEX_RUNBOOK.md`

When policy or risk is unclear, read:

- `docs/KOHEE_MASTER_CONTEXT.md`
- `kohee.contract.json`

## Core rules

- User-facing goal: user says `진행`; ChatGPT routes a task packet; Cloudflare/GitHub App records it; Local Codex works one scoped task; GitHub evidence decides merge or hold.
- GitHub evidence wins: PR URL, head SHA, changed files, diff, checks, review threads, workflow logs, issue state.
- Codex self-reports, local branch names, local commits, or `make_pr` metadata are not completion evidence.
- LOW/MEDIUM can auto-merge only after evidence gates pass and project profile allows it.
- HIGH/HOLD requires explicit user approval.
- Keep docs, logs, code, and PR bodies short and action-oriented.
- No broad refactor.
- No manager expansion.
- No `aaa/aaaa`.
- No deploy unless explicitly requested.
- Do not apply D1 migrations.
- While `AUTOMATION_PLATFORM` is active, do not start KOHEE product work from `docs/queues/KOHEE_PRODUCT.md`.

## Tracks

- `CHATGPT_CONTROL`: ChatGPT interprets user direction, chooses/normalizes the next task, and creates/requests a task packet.
- `CLOUDFLARE_GITHUB_APP`: online execution arm for GitHub task packets, issue/PR comments/status, evidence, and allowed LOW/MEDIUM merge actions after gates pass.
- `LOCAL_CODEX`: actual code worker for local repo edits, checks, commits, pushes, and PR creation/update.

## Local Codex

Local Codex should start from GitHub task/evidence state, not a long user-pasted prompt:

1. Read `docs/AUTOMATION_CONSTITUTION.md`.
2. Read `docs/QUEUE_ROUTER.md`.
3. Read `docs/AUTOMATION_OPERATOR_RAIL.md`.
4. Follow the router to the active queue.
5. If active lane is `AUTOMATION_PLATFORM`, read and follow `docs/queues/AUTOMATION_PLATFORM.md`.
6. Read `docs/LOCAL_CODEX_RUNBOOK.md`.
7. Read the active task packet from issue `#23` only when the active queue points there.
8. Inspect open PRs, failed checks, and unresolved review threads.
9. Work only on the current blocker or next routed task.
10. Open or update one scoped PR, then stop and report evidence.

## Parallel work

Parallel work is allowed only for LOW/MEDIUM tasks with no file overlap, no risk-area overlap, and no shared test-file overlap.

Do not parallelize HIGH/HOLD work, D1/schema/migrations, public data behavior, CSV import/reset, deploy config, GitHub App control-plane connection, manager removal touching shared server/tests, or same-file changes.

## Report format

Automation lane and GitHub evidence reports use:

```text
Status / Blocker / Next action / Evidence
```

Implementation reports may add changed files, tests, and remaining risks, but they must still include the evidence fields above.
