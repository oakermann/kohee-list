# KOHEE LIST

Cloudflare Pages + Workers + D1 based cafe curation platform for KOHEE LIST.

This workspace keeps the live behavior intact while reorganizing the codebase
into a cleaner, contract-preserving structure.

## Structure

- `worker.js`
  - Thin Worker entrypoint
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
  - Pages deployment source
- `.pages-deploy/assets/`
  - Frontend shared modules
  - `common.js`: API/auth/share/map/date/common UI helpers
  - `index.js`, `login.js`, `submit.js`, `mypage.js`, `admin.js`
- `assets/`
  - Synced local copy of frontend assets for direct file testing
- `aaaa/`
  - Extra local synced copy used during UI checks
- `scripts/`
  - Validation, deployment, smoke-test, and CSV backup scripts
- `schema.sql`
  - D1 schema
- `sync-pages.ps1`
  - Sync `.pages-deploy` HTML/assets into local mirrors

## Current Auth Model

- Signup/login uses site-local username/password
- Passwords are hashed in the Worker
- Sessions are server-side and stored in D1
- Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`
- Roles:
  - `user`
  - `manager`
  - `admin`
- First admin bootstrap is protected by `FIRST_ADMIN_CODE`
  - The very first signup becomes `admin`
  - That first signup must provide the configured admin code

## Required Cloudflare Setup

1. Create D1 and put the binding info into `wrangler.toml`
2. Run schema:

```powershell
npx.cmd wrangler d1 execute kohee-list --remote --file=./schema.sql
```

3. Set Worker secrets:

```powershell
npx.cmd wrangler secret put SESSION_SECRET
npx.cmd wrangler secret put FIRST_ADMIN_CODE
```

4. Confirm environment variables in `wrangler.toml`
   - `SESSION_DAYS`
   - `FRONTEND_ORIGIN`

## Daily Commands

Sync local mirrors from `.pages-deploy`:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-pages.ps1
```

Deploy Worker:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-worker.ps1
```

Deploy Pages:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-pages.ps1
```

Deploy all:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-all.ps1
```

Run safe release pipeline:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release-safe.ps1
```

Run safe release pipeline and also commit/push:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release-safe.ps1 -CommitAndPush -CommitMessage "Your message"
```

Run smoke test:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Mode full
```

Run Git save/push helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git-sync.ps1 -CommitMessage "Your message"
```

Run syntax checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1
```

Run safe maintenance automation locally:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\auto-maintenance.ps1
```

Export live cafe data to CSV backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-csv.ps1
```

Import CSV through the live admin API:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-csv.ps1 -CsvPath .\backups\cafes-latest.csv -Token <ADMIN_OR_MANAGER_TOKEN>
```

## Smoke Test Coverage

`scripts/smoke-test.ps1` verifies:

- `/health`
- `/data`
- signup/login/me
- favorites add/remove/list
- cafe submission + `/my-submits`
- error report + `/my-error-reports`
- admin-only flows in `full` mode
  - `/users`
  - `/reply-error-report`
  - `/resolve-error-report`
  - `/add`
  - `/delete`

The script creates a temporary user and removes it during cleanup.

## CSV Backup Flow

- `scripts/export-csv.ps1`
  - Fetches `/data`
  - Writes a timestamped CSV backup into `backups/`
- `scripts/import-csv.ps1`
  - Sends a CSV file to `/import-csv`
  - Requires a manager/admin bearer token

This keeps backup and restore aligned with the same CSV schema used by the admin console.

## Safe Automation Flow

- `scripts/auto-maintenance.ps1`
  - Runs syntax validation
  - Checks live Worker `/health`
  - Checks live `/data`
  - Exports a timestamped CSV backup

This is the recommended low-risk automation entrypoint because it does not deploy code and does not modify production data.

## Recommended Automation Level

- `scripts/release-safe.ps1`
  - Syncs page mirrors
  - Runs syntax checks
  - Creates a CSV backup
  - Deploys Worker + Pages
  - Runs the full smoke test
  - Can optionally commit/push at the end

This is the recommended "strong but still safe" automation level for KOHEE LIST.

## CI

- GitHub Actions workflow:
  - `.github/workflows/validate.yml`
- It runs syntax validation for:
  - Worker entrypoint
  - `server/*.js`
  - `.pages-deploy/assets/*.js`
  - `sync-pages.ps1`
  - `scripts/*.ps1`

To activate CI for real:

1. Initialize Git in this folder if needed
2. Create a GitHub repository
3. Push this workspace to GitHub
4. GitHub Actions will start running `Validate` on push and pull request

## Frontend Notes

- Main source for Pages deploy is `.pages-deploy/`
- Root HTML/assets and `aaaa/` are synced mirrors for local checks
- Shared frontend logic lives in `.pages-deploy/assets/common.js`
- Page-specific logic is split by screen instead of keeping giant inline scripts

## Operational Notes

- CSV is a secondary admin tool, not the main workflow
- Primary operating flow is:
  - user submit
  - manager/admin review
  - approve/reject
  - reflect into cafes
- Error reports now support admin/manager replies
- My page shows favorites, submissions, and error report replies

## Caution

- If you open HTML with `file://`, cookie-based login can behave differently
- Local HTML can still call the live Worker if `API_BASE` points to production
- Test carefully before touching production data
