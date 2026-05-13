# KOHEE LIST Agent Contract

Purpose: short entrypoint for ChatGPT, Cloudflare/GitHub App automation, and Local Codex.

## Current routing

The active lane is `AUTOMATION_PLATFORM` until the project-factory automation rail can safely manage product work or the owner/ChatGPT explicitly defers it for an urgent product bug.

Canonical active files:

- `docs/QUEUE_ROUTER.md`: active lane/router. Read this first.
- `docs/AUTOMATION_OPERATOR_RAIL.md`: active project-factory operating rail.
- `docs/queues/AUTOMATION_PLATFORM.md`: active automation-platform execution queue.
- `docs/queues/KOHEE_PRODUCT.md`: paused KOHEE product queue. Do not start it while the automation lane is active unless explicitly deferred by the owner/ChatGPT.

Reference/backlog docs:

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`
- `docs/AUTOMATION_PLATFORM_6B*.md`
- `docs/AUTOMATION_PLATFORM_6C_MATURITY_GATE.md`
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`

## Fixed operating model

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> automation decision -> merge or hold
```

## Read path

Always read:

1. `docs/QUEUE_ROUTER.md`
2. `docs/AUTOMATION_OPERATOR_RAIL.md`
3. If the router says `AUTOMATION_PLATFORM`, read `docs/queues/AUTOMATION_PLATFORM.md`
4. Current PR / issue / check logs relevant to the task

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

1. Read `docs/QUEUE_ROUTER.md`.
2. Read `docs/AUTOMATION_OPERATOR_RAIL.md`.
3. Follow the router to the active queue.
4. If active lane is `AUTOMATION_PLATFORM`, read and follow `docs/queues/AUTOMATION_PLATFORM.md`.
5. Read `docs/LOCAL_CODEX_RUNBOOK.md`.
6. Read the active task packet from issue `#23` or the active task queue.
7. Inspect open PRs, failed checks, and unresolved review threads.
8. Work only on the current blocker or next routed task.
9. Open or update one scoped PR, then stop and report evidence.

## Parallel work

Parallel work is allowed only for LOW/MEDIUM tasks with no file overlap, no risk-area overlap, and no shared test-file overlap.

Do not parallelize HIGH/HOLD work, D1/schema/migrations, public data behavior, CSV import/reset, deploy config, GitHub App control-plane connection, manager removal touching shared server/tests, or same-file changes.

## Report format

Automation lane and GitHub evidence reports use:

```text
Status / Blocker / Next action / Evidence
```

Implementation reports may add changed files, tests, and remaining risks, but they must still include the evidence fields above.
