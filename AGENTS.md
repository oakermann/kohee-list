# KOHEE LIST Agent Contract

Purpose: short entrypoint for ChatGPT, Codex, and local Codex.

## Current routing

The active lane is `AUTOMATION_PLATFORM` until the platform maturity gate passes or the owner/ChatGPT explicitly defers it for an urgent product bug.

Canonical queue files:

- `docs/QUEUE_ROUTER.md`: queue router. Read this first.
- `docs/queues/AUTOMATION_PLATFORM.md`: active automation-platform execution queue. Local Codex should follow this while the automation lane is active.
- `docs/queues/KOHEE_PRODUCT.md`: paused KOHEE product queue. Do not start it while the automation lane is active unless explicitly deferred by the owner/ChatGPT.

Supporting docs:

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`: work categories, grouping, and phase order.
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`: advanced automation hardening backlog.

Legacy compatibility files:

- `docs/KOHEE_ACTIVE_QUEUE.md` redirects to `docs/QUEUE_ROUTER.md`.
- `docs/AUTOMATION_ACTIVE_QUEUE.md` redirects to `docs/queues/AUTOMATION_PLATFORM.md`.
- `docs/KOHEE_PRODUCT_QUEUE.md` redirects to `docs/queues/KOHEE_PRODUCT.md`.

## Read path

Always read:

1. `docs/QUEUE_ROUTER.md`
2. If the router says `AUTOMATION_PLATFORM`, read `docs/queues/AUTOMATION_PLATFORM.md`
3. Current PR / issue / check logs relevant to the task

For local PC work, also read:

- `docs/LOCAL_CODEX_RUNBOOK.md`

When policy or risk is unclear, read:

- `docs/KOHEE_MASTER_CONTEXT.md`
- `kohee.contract.json`

Reference only:

- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`
- `docs/CODEX_AUTOMATION_STATUS.md`
- `docs/CODEX_WORKFLOW.md`
- archived audit/planning docs

## Core rules

- GitHub evidence wins: PR URL, head SHA, changed files, diff, checks, review threads, workflow logs, issue state.
- Codex self-reports, local branch names, local commits, or `make_pr` metadata are not completion evidence.
- Keep docs, logs, code, and PR bodies short and action-oriented.
- No broad refactor.
- No manager expansion.
- No `aaa/aaaa`.
- No deploy unless explicitly requested.
- Do not apply D1 migrations.
- While `AUTOMATION_PLATFORM` is active, do not start KOHEE product work from `docs/queues/KOHEE_PRODUCT.md`.
- Product work resumes only after the platform maturity gate or an explicit owner/ChatGPT deferral.

## Tracks

- `MOBILE_TRACK`: ChatGPT/GitHub connector can plan, review, edit docs/queue, inspect PRs/checks, and handle safe GitHub edits.
- `LOCAL_TRACK`: local Codex should execute when the task needs local tests, `gh`, `wrangler`, Cloudflare checks, or deeper local debugging.

If MOBILE hits local-tool requirements, move it to LOCAL instead of forcing progress.

## Local Codex

Local Codex should start from GitHub state, not a long pasted prompt:

1. Read `docs/QUEUE_ROUTER.md`.
2. Follow the router to the active queue.
3. If active lane is `AUTOMATION_PLATFORM`, read and follow `docs/queues/AUTOMATION_PLATFORM.md`.
4. Read `docs/LOCAL_CODEX_RUNBOOK.md`.
5. Inspect issue `#23` and open PRs marked `HOLD_LOCAL_REQUIRED` when relevant.
6. Work only on the recorded blocker or next active automation task.
7. Record a short result in `docs/audits/LOCAL_CODEX_AUDIT_LOG.md` and on the target PR or issue.

## Parallel work

Parallel work is allowed only for LOW/MEDIUM tasks with no file overlap, no risk-area overlap, and no shared test-file overlap.

Do not parallelize HIGH/HOLD work, D1/schema/migrations, public `/data`, CSV import/reset, deploy config, GitHub App control-plane connection, manager removal touching shared server/tests, or same-file changes.

## Report format

Automation lane and GitHub evidence reports use:

```text
Status / Blocker / Next action / Evidence
```

Implementation reports may add changed files, tests, and remaining risks, but they must still include the evidence fields above.
