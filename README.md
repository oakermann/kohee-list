# KOHEE LIST

Cloudflare Pages + Workers + D1-based cafe curation platform for KOHEE LIST.

KOHEE LIST is a product repository. OAP is maintained separately.

This workspace keeps the live behavior intact while organizing the cafe product,
product validation, deploy safety, and D1/CSV/public-data guardrails.

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
Root HTML/assets are synced mirrors for repository validation only, not a separate
operating surface.

The input "ㅁㄴㅇㄻㄴㅇㄹ" is random Korean keyboard characters — not a meaningful request. There's nothing to specify or plan. | Please send a real task or question.
