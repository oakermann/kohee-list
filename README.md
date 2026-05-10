# KOHEE LIST

Cloudflare Pages + Workers + D1 based cafe curation platform for KOHEE LIST.

This workspace keeps the live behavior intact while reorganizing the codebase
into a cleaner, contract-preserving structure.

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

- `worker.js`
  - Cloudflare Workers entrypoint used by production
- `server/`
  - Backend handlers split by domain
  - `shared.js`: common helpers, auth/session utilities, JSON/CORS helpers
  - `auth.js`: signup, login, logout, me
  - `cafes.js`: public data, notice, cafe CRUD, CSV reset
  - `submissions.js`: cafe submission flow
  - `errorReports.js`: error report flow and replies
  - `favorites.js`: favorite add/remove/list
  - `users.js`: user list and role changes
  - `csv.js`: CSV import logic
  - `routes.js`: route table
- `.pages-deploy/`
  - Cloudflare Pages deployment source of truth
- `.pages-deploy/assets/`
  - Frontend shared modules
  - `common.js`: API/auth/share/map/date/common UI helpers
  - `index.js`, `login.js`, `submit.js`, `mypage.js`, `admin.js`
- `assets/`
  - Repository mirror of `.pages-deploy/assets/` for sync verification
- Root HTML files (`index.html`, `login.html`, `submit.html`, `mypage.html`, `admin.html`)
  - Repository mirrors of `.pages-deploy/*.html` for sync verification
- `scripts/`
  - Validation, deployment, smoke-test, and CSV backup scripts
- `schema.sql`
  - Base D1 schema
- `sync-pages.ps1`
  - Sync `.pages-deploy` HTML/assets into local mirrors

There is currently no separate `public/` directory in this repository.
For Pages deploys, treat `.pages-deploy/` as the authoritative frontend source.
Root HTML/assets are synced mirrors for repository validation only, not a separate operating surface.
