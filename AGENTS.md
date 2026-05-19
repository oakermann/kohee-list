# KOHEE LIST Agent Contract

KOHEE LIST is a product repository. OAP is maintained separately.

Purpose: keep work scoped to the KOHEE cafe product, its product safety checks,
and its deploy/D1 guardrails.

## Read First

Before changing repository behavior, read:

1. `docs/KOHEE_MASTER_CONTEXT.md`
2. `kohee.contract.json`
3. `README.md`
4. Any product document directly related to the task

## Product Boundary

Do not change product runtime behavior unless the user explicitly asks for that
specific product change.

Hard no-change areas unless explicitly approved:

- `server/**`
- `assets/**`
- `.pages-deploy/**`
- `migrations/**`
- `schema.sql`
- `worker.js`
- auth/session behavior
- D1 behavior
- CSV import/reset behavior
- public `/data` behavior
- cafe lifecycle behavior
- Cloudflare deploy behavior
- secrets or production config

## Keep

- KOHEE product code
- KOHEE product tests
- deploy safety checks
- D1 migration blocking
- CSV/public data/lifecycle safety checks
- smoke checks

Expected validation commands for product-safe repository work:

```text
npm run check:deploy-sync
npm run test:unit
npm run verify:release
git diff --check
```

Use `npm run audit:kohee` when product invariants or governance references are
touched.

## Core Rules

- Preserve public cafe exposure rules.
- Preserve candidate-first CSV import behavior.
- Preserve admin/user role boundaries.
- Preserve manual-review treatment for D1/schema/migrations.
- Do not add unattended worker, auto-merge, branch deletion, or issue-close
  features in this repository.
- Keep reports concise and evidence-based.

## Report Format

Use:

```text
Status
Blocker
Next action
Evidence
```
