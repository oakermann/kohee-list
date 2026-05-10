# KOHEE Active Queue

Last updated: 2026-05-11
Status owner: ChatGPT orchestration baseline

This file is the active operational queue for ChatGPT-led KOHEE LIST work.

Use this file as the current working overlay on top of `docs/KOHEE_MASTER_CONTEXT.md`.

- `docs/KOHEE_MASTER_CONTEXT.md` = long-term source of truth
- `docs/KOHEE_ACTIVE_QUEUE.md` = current queue, blockers, next patch candidates, and operational status

## Current repo state

- Open PRs: 0
- Active issue: #23
- Current operating model: ChatGPT-main
- GitHub evidence wins over Codex self-report

## Current P0 queue

### P0-1 — ChatGPT-main stabilization
State: mostly completed / maintain

### P0-2 — Master source-of-truth
State: completed / maintain
Canonical file:
- `docs/KOHEE_MASTER_CONTEXT.md`

### P0-3 — Parallel lane enforcement
State: partially implemented

Current gap:
- no hard validator for:
  - same-file overlap
  - shared test overlap
  - HIGH/HOLD parallel denial
  - merge-order conflicts

Next patch candidate:
- `scripts/validate-kohee-command.mjs`

### P0-4 — GitHub App Worker Phase 2 dry-run
State: deferred until explicit user start

Requirements:
- local gh auth
- local wrangler auth

Must not:
- run from Codex Cloud
- enable write actions
- enable auto-merge
- modify production runtime

## Current blockers

### automation control-plane incomplete
- policy exists
- validator layer incomplete

### context fragmentation
- status split across docs/issues/chat state

## Current HIGH/HOLD

### HOLD — D1 manager role schema removal
### HOLD — resetCsv redesign
### HOLD — evidence/category verification DB

## Current next patch candidates

### Candidate A — Parallel lane validator
Goal:
- deny same-file overlap
- deny shared test overlap
- deny HIGH parallelism
- enforce merge-order metadata

### Candidate B — Dispatch overwrite protection
Goal:
- avoid updating unrelated queued command issue

## Current completed baseline

Completed:
- ChatGPT-main transition baseline
- KOHEE_MASTER_CONTEXT.md
- Codex self-report distrust baseline
- manager runtime/admin removal
- policy guard baseline

## Do not touch without user approval

Never auto-change:
- D1 migrations
- auth/session
- public exposure rules
- CSV import/reset semantics
- deploy workflows
- Cloudflare secrets
