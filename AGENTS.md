# KOHEE LIST Agent Contract

This repo is KOHEE LIST.

Always follow `docs/CODEX_WORKFLOW.md`.

Read `kohee.contract.json` before planning.

Use exact file/function allowlists.

One lane, one task, one commit.

No broad refactor.

No manager expansion.

No `aaa/aaaa`.

No deploy unless explicitly requested.

Do not apply D1 migrations.

Report format must include:

```text
Risk / Lane / Commit or PR / Changed files / Changed functions / Tests / Remaining risks
```

## KOHEE GITHUB COMMAND BRIDGE

GitHub is the command bridge, task ledger, evidence store, and CI/review/deploy gate.
GitHub evidence wins: Codex self-reports are status notes, not final truth.

- User talks only to ChatGPT for normal KOHEE LIST work and handles HIGH-risk approval, HOLD release, and product direction only.
- ChatGPT is the planner, command writer, verifier, and user-facing reporter. It writes `KOHEE_COMMAND`, calls `@codex`, verifies actual GitHub evidence, and reports concise status as `VERIFIED`, `UNVERIFIED`, or `CONFLICTED`.
- Codex is the executor and reworker. It reads `AGENTS.md`, `kohee.contract.json`, and `docs/CODEX_WORKFLOW.md` before planning, implements, tests, opens PRs, fixes safe LOW/MEDIUM failures, and mirrors task state into GitHub with `KOHEE_STATUS`.
- For normal LOW/MEDIUM work, Codex must not stop at PR creation. It should continue until `MERGED_AND_DEPLOYED`, `DONE_NO_DEPLOY`, or `HOLD`, unless the task explicitly requires manual review.
- This governance PR is manual-review only: Codex must open the PR, run required verification, update `KOHEE_STATUS` as `PR_OPEN` / user review required, and must not mark `DONE_NO_DEPLOY` before ChatGPT verifies the PR is merged and no runtime deploy is required.
- Codex must inspect checks and Codex review P1/P2 findings when available. If checks/reviews are pending, unavailable, or not checked, report that state instead of success.
- Codex must fix safe LOW/MEDIUM failures in the same branch. Repeated failures require root-cause analysis, not blind retry.
- HIGH-risk changes, unexpected scope expansion, permission/secret blockers, deploy blockers, product-direction questions, and verification conflicts must become `HOLD`.
- `KOHEE_COMMAND.allowed_files` may override lane defaults only when explicitly recorded in GitHub. File override cannot waive HIGH-risk approval or HOLD requirements.
- `QUEUED_STALE` must not be inferred from elapsed time alone; it requires no `KOHEE_STATUS` update, no PR activity, and no acknowledgement evidence.

Before ChatGPT reports completion to the user, ChatGPT must verify actual GitHub state: PR state, head SHA, changed files, actual diff, GitHub checks, Codex review P1/P2, unresolved review threads, root/.pages-deploy sync, asset cache-bust when assets changed, HIGH-risk paths/topics, and deploy status when applicable. If verification was not performed, status is `UNVERIFIED`, not complete. If Codex status conflicts with GitHub evidence, GitHub evidence wins.
