# KOHEE LIST Agent Contract

KOHEE LIST is a cafe curation product repository. OAP is maintained separately.

## Required Read Order

1. `kohee.contract.json`
2. `docs/KOHEE_MASTER_CONTEXT.md`
3. `docs/KOHEE_CONSTITUTION.md`
4. Task-specific policy docs linked from the master context
5. The exact files needed for the task

Do not use chat memory as source of truth. If instructions conflict, follow
`docs/KOHEE_CONSTITUTION.md` and `kohee.contract.json` first.

## Protected Areas

Do not change these without explicit scoped approval:

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
- deploy behavior, secrets, or production config

For HIGH/HOLD areas, stop and report instead of modifying.

## Repository Boundary

- Do not restore OAP platform artifacts.
- Do not add task packet systems, watchers, bridges, GitHub App workers,
  decision engines, project profiles, control-plane dry-runs, auto-merge bots,
  branch deletion, or issue-close automation here.
- Product runtime must not be changed by docs-only cleanup.

## Required Validation

Run the validation listed in `kohee.contract.json` for the task risk. For
docs/contract work, run at minimum:

```text
npm run check:deploy-sync
npm run test:unit
npm run audit:kohee
npm run verify:release
git diff --check
node scripts/detect-changed-areas.mjs --working-tree
```

## Final Report

Always include:

- changed files
- validation results
- risk
- unverified items
- remaining risks or HOLD blockers
