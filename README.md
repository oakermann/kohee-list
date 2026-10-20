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
  - `cafes.js`: public data, notice, cafe CRUD
  - `submissions.js`: cafe submission flow
  - `errorReports.js`: error report flow and replies
  - `favorites.js`: favorite add/remove/list
  - `users.js`: user list and role changes
  - `csv.js`: CSV import logic
  - `routes.js`: route table
- `site/`
  - The only frontend copy: HTML pages, `_headers`, `assets/`. Served by the Worker
    (`[assets]` in `wrangler.toml`) and by Pages (`wrangler pages deploy site`)
- `site/assets/`
  - `common.js`: API/auth/share/map/date/common UI helpers
  - `index.js`, `login.js`, `submit.js`, `mypage.js`, `admin.js`
- `functions/`
  - Pages Functions (`/api` proxy)
- `scripts/`
  - Validation, deployment, smoke-test, and CSV backup scripts
- `schema.sql`
  - Base D1 schema

When a `site/assets/*` file changes, bump its `?v=` in every HTML page that loads it
(`/assets/*` is cached immutable). If `common.js` changes, also bump the entry scripts
that import it.
