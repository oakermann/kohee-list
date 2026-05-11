# KOHEE LIST Agent Contract

Purpose: short entrypoint for ChatGPT, Codex, and local Codex.

## Read path

Always read:

1. `docs/KOHEE_ACTIVE_QUEUE.md`
2. Current PR / issue / check logs relevant to the task

For local PC work, also read:

- `docs/LOCAL_CODEX_RUNBOOK.md`

When policy or risk is unclear, read:

- `docs/KOHEE_MASTER_CONTEXT.md`
- `kohee.contract.json`

Reference only:

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

## Tracks

- `MOBILE_TRACK`: ChatGPT/GitHub connector can plan, review, edit docs/queue, inspect PRs/checks, and handle safe GitHub edits.
- `LOCAL_TRACK`: local Codex should execute when the task needs local tests, `gh`, `wrangler`, Cloudflare checks, or deeper local debugging.

If MOBILE hits local-tool requirements, move it to LOCAL instead of forcing progress.

## Local Codex

Local Codex should start from GitHub state, not a long pasted prompt:

1. Read `docs/LOCAL_CODEX_RUNBOOK.md`.
2. Read `docs/KOHEE_ACTIVE_QUEUE.md`.
3. Inspect issue `#23` and open PRs marked `HOLD_LOCAL_REQUIRED`.
4. Work only on the recorded blocker.
5. Record a short result in `docs/audits/LOCAL_CODEX_AUDIT_LOG.md` and on the target PR or issue.

## Parallel work

Parallel work is allowed only for LOW/MEDIUM tasks with no file overlap, no risk-area overlap, and no shared test-file overlap.

Do not parallelize HIGH/HOLD work, D1/schema/migrations, public `/data`, CSV import/reset, deploy config, GitHub App control-plane connection, manager removal touching shared server/tests, or same-file changes.

## Report format

```text
Status / Changed files / Tests / Remaining risks / Next action / Evidence
```
