# KOHEE LIST

Cloudflare Pages + Workers + D1 based cafe curation platform for KOHEE LIST.

This workspace keeps the live behavior intact while reorganizing the codebase into a cleaner, contract-preserving structure.

## Automation Status

Current automation source of truth:

- [`docs/KOHEE_MASTER_CONTEXT.md`](docs/KOHEE_MASTER_CONTEXT.md)

Additional automation/runbook details:

- [`docs/CODEX_AUTOMATION_STATUS.md`](docs/CODEX_AUTOMATION_STATUS.md)
- [`docs/CODEX_WORKFLOW.md`](docs/CODEX_WORKFLOW.md)

Current operating model:

- ChatGPT GitHub connector = primary executor/orchestrator
- GitHub Actions = validation/deploy gate
- Codex = reviewer / analysis / PATCH_READY support
- GitHub evidence = source of truth
- GitHub App + Cloudflare Worker automation = future dry-run/write-execution layer under ChatGPT/GitHub evidence control

LOW/MEDIUM work may run in parallel when files/risk areas do not overlap. HIGH/HOLD work remains sequential and user-approved.

## Structure

- `worker.js`: Cloudflare Workers entrypoint used by production
- `server/`: backend handlers split by domain
- `.pages-deploy/`: Cloudflare Pages deployment source of truth
- `assets/`: repository mirror of frontend assets for sync verification
- root HTML files: repository mirrors of `.pages-deploy/*.html`
- `scripts/`: validation, deployment, smoke-test, and CSV backup scripts
- `schema.sql`: base D1 schema
- `sync-pages.ps1`: sync frontend mirrors

There is currently no separate `public/` directory in this repository. For Pages deploys, treat `.pages-deploy/` as the authoritative frontend source. Root HTML/assets are synced mirrors for repository validation only.

## Current Auth Model

- Signup/login uses site-local username/password.
- Passwords are hashed in the Worker.
- Sessions are server-side and stored in D1.
- Session cookie uses hardened browser cookie settings.
- A separate CSRF cookie is issued for unsafe authenticated requests.
- Frontend auth is cookie-first and no longer stores the session token in localStorage.
- Login failures, signup, and user submissions are rate-limited.
- Runtime roles exposed to clients:
  - `user`
  - `admin`
- First admin bootstrap is protected by configured deployment settings.

## Required Cloudflare Setup

1. Create D1 and put the binding info into `wrangler.toml`.
2. For new databases or existing production databases, follow `docs/D1_MIGRATION_RUNBOOK.md` before applying any schema or migration file.
3. Production D1 schema/migration changes are HIGH/HOLD work.
4. Do not copy-paste remote migration commands without an approved backup, migration, and rollback plan.
5. GitHub Actions must not automatically apply remote D1 migrations.
6. Configure required Worker secrets through the deployment provider; do not store secret values in the repository.

## Daily Commands

Verify deploy-source sync:

```powershell
npm run check:deploy-sync
```

Run syntax checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1
```

Run unit tests:

```powershell
npm run test:unit
```

## CI

Required GitHub repository secrets for Cloudflare deploy workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Secrets must be stored in GitHub repository Settings -> Secrets and variables -> Actions. Do not hardcode secret values in code, docs examples, or logs.

## Operational Notes

- CSV is a secondary admin tool, not the main workflow.
- Primary operating flow is user submit -> admin review -> approve/reject -> reflect into cafes.
- Error reports support admin replies.
- My page shows favorites, submissions, and error report replies.
