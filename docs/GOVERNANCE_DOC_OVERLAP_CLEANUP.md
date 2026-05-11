# KOHEE Governance Document Overlap Cleanup

## Problem

KOHEE automation rules currently appear across multiple files:

- `AGENTS.md`
- `docs/KOHEE_MASTER_CONTEXT.md`
- `docs/KOHEE_ACTIVE_QUEUE.md`
- `docs/CODEX_AUTOMATION_STATUS.md`
- `docs/CODEX_WORKFLOW.md`
- `kohee.contract.json`

This can create drift when one file is updated and another is not.

## Source hierarchy

1. `docs/KOHEE_MASTER_CONTEXT.md`
   - long-term policy
   - lifecycle
   - risk
   - security
   - deployment
2. `docs/KOHEE_ACTIVE_QUEUE.md`
   - current queue
   - blockers
   - next patch candidates
   - operational state
3. `kohee.contract.json`
   - machine-readable policy boundaries
   - lanes
   - denylist
   - verification commands
4. `AGENTS.md`
   - concise execution contract for agents
5. Legacy/reference docs
   - `docs/CODEX_AUTOMATION_STATUS.md`
   - `docs/CODEX_WORKFLOW.md`

## Cleanup rule

- Do not duplicate long policy prose in every file.
- Keep AGENTS concise and refer to MASTER_CONTEXT.
- Keep ACTIVE_QUEUE focused on current operational truth.
- Keep machine-readable rules in `kohee.contract.json`.
- If a rule changes, update source-of-truth first, then references.

## Audit checks to add later

- duplicated phrase detection for ChatGPT-main role
- duplicated HIGH/HOLD list drift
- stale references to manager runtime behavior
- stale references to Codex-main execution
- stale references to manual-only workflows

## Non-goals

- no deletion of docs without review
- no runtime changes
- no workflow behavior changes
