# KOHEE LIST

Cloudflare Pages + Workers + D1 based cafe curation platform for KOHEE LIST.

This workspace keeps the live behavior intact while reorganizing the codebase
into a cleaner, contract-preserving structure.

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
  - Synced local mirror of `.pages-deploy/assets/` for direct file testing
- Root HTML files (`index.html`, `login.html`, `submit.html`, `mypage.html`, `admin.html`)
  - Synced local mirrors of `.pages-deploy/*.html`
- `aaaa/`
  - Extra local synced mirror used during manual UI checks
- `scripts/`
  - Validation, deployment, smoke-test, and CSV backup scripts
- `schema.sql`
  - Base D1 schema
- `sync-pages.ps1`
  - Sync `.pages-deploy` HTML/assets into local mirrors

There is currently no separate `public/` directory in this repository.
For Pages deploys, treat `.pages-deploy/` as the authoritative frontend source.
Root HTML/assets and `aaaa/` are mirrors kept for local testing and manual checks.

## Current Auth Model

- Signup/login uses site-local username/password
- Passwords are hashed in the Worker
- Sessions are server-side and stored in D1
- Session cookie is `HttpOnly`, `Secure`, `SameSite=None`
- A separate `kohee_csrf` cookie is issued for unsafe authenticated requests
- Login returns the authenticated user payload and sets the session cookie
- Frontend auth is cookie-first and no longer stores the session token in `localStorage`
- Login failures are rate-limited by IP + username
- Signup and user submissions are rate-limited to reduce spam
- Roles:
  - `user`
  - `manager`
  - `admin`
- First admin bootstrap is protected by `FIRST_ADMIN_CODE`
  - The very first signup becomes `admin`
  - That first signup must provide the configured admin code

## Required Cloudflare Setup

1. Create D1 and put the binding info into `wrangler.toml`
2. Run schema for a new database:

```powershell
npx.cmd wrangler d1 execute kohee-list --remote --file=./schema.sql
```

For an existing local database, apply migrations in order instead of replaying
the whole schema:

```powershell
npx.cmd wrangler d1 execute kohee-list --local --file=./migrations/0002_rate_limits.sql
npx.cmd wrangler d1 execute kohee-list --local --file=./migrations/0003_audit_logs.sql
npx.cmd wrangler d1 execute kohee-list --local --file=./migrations/0004_session_security.sql
```

For the production D1 database, use `--remote`:

```powershell
npx.cmd wrangler d1 execute kohee-list --remote --file=./migrations/0002_rate_limits.sql
npx.cmd wrangler d1 execute kohee-list --remote --file=./migrations/0003_audit_logs.sql
npx.cmd wrangler d1 execute kohee-list --remote --file=./migrations/0004_session_security.sql
```

3. Set Worker secrets:

```powershell
npx.cmd wrangler secret put SESSION_SECRET
npx.cmd wrangler secret put FIRST_ADMIN_CODE
```

`SESSION_SECRET` is mandatory in every environment that uses auth/session flows.
There is no insecure default fallback in production code.

4. Confirm environment variables in `wrangler.toml`
   - `SESSION_DAYS`
   - `FRONTEND_ORIGIN`
   - `ALLOW_NULL_ORIGIN` only for explicit local/dev testing, normally unset

`FRONTEND_ORIGIN` should contain the Pages origin that is allowed to send
credentialed browser requests, for example `https://kohee.pages.dev`.
Unknown origins do not receive credentialed CORS headers.
Multiple frontend origins are comma-separated:
`https://kohee.pages.dev,https://example.com`.

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

Run unit tests:

```powershell
npm run test:unit
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
powershell -ExecutionPolicy Bypass -File .\scripts\import-csv.ps1 -CsvPath .\backups\cafes-latest.csv -Username <ADMIN_OR_MANAGER_USERNAME> -Password <PASSWORD>
```

Preview CSV import without changing D1:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-csv.ps1 -CsvPath .\backups\cafes-latest.csv -Username <ADMIN_OR_MANAGER_USERNAME> -Password <PASSWORD> -DryRun
```

Legacy bearer-token mode is still supported for maintenance scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-csv.ps1 -CsvPath .\backups\cafes-latest.csv -Token <ADMIN_OR_MANAGER_TOKEN>
```

## Smoke Test Coverage

`scripts/smoke-test.ps1` verifies:

- `/health`
- `/data`
- signup/login/me/logout
- CSRF cookie issuance and unsafe request header flow
- login failure rate limiting
- favorites add/remove/list
- cafe submission + `/my-submits`
- error report + `/my-error-reports`
- admin-only flows in `full` mode
  - `/users`
  - `/set-role`
  - `/reply-error-report`
  - `/resolve-error-report`
  - `/add`
  - `/edit`
  - `/delete`
  - `/notice`
  - `/import-csv?dryRun=1`
  - `/import-csv`
  - `/update-submission`
  - `/approve`
  - `/reject`
  - manager cannot set `oakerman_pick`
  - admin can set `oakerman_pick`

The script creates a temporary user and removes it during cleanup.
It deliberately does not execute `/reset-csv` because that endpoint deletes all
live cafe rows.

## CSV Backup Flow

- `scripts/export-csv.ps1`
  - Fetches `/data`
  - Writes a timestamped CSV backup into `backups/`
- `scripts/import-csv.ps1`
  - Sends a CSV file to `/import-csv`
  - Requires a manager/admin bearer token
  - Supports `-DryRun` to validate without writing

This keeps backup and restore aligned with the same CSV schema used by the admin console.

## Security Runtime Notes

- `kohee_session`
  - HttpOnly
  - Secure
  - SameSite=None
- `kohee_csrf`
  - readable by frontend JavaScript
  - Secure
  - SameSite=None
  - sent back on unsafe requests as `x-csrf-token`
- Bearer-token-only maintenance requests bypass CSRF because they do not rely on
  browser cookies.
- Audit logs are written with `safeWriteAuditLog`; if audit logging fails, the
  main user/admin action still succeeds and the Worker logs the failure.
- `rate_limits` tracks login failures and short-window spam controls for signup,
  submissions, and error reports.

## Post-Deploy Checklist

- 회원가입 가능
- 로그인 가능
- 로그인 후 `/me` 정상
- 로그아웃 가능
- 일반 유저 제보 가능
- 일반 유저가 `/add` 접근 시 `403`
- manager/admin이 카페 추가 가능
- manager가 `oakerman_pick` 변경 못함
- admin은 `oakerman_pick` 변경 가능
- CSV dry-run 가능
- CSV 실제 import 가능
- 오류 제보 가능
- 운영자 답변 가능
- 즐겨찾기 추가/삭제 가능
- CORS origin 틀리면 차단됨
- 로그인 실패 5회 후 `RATE_LIMITED` 반환

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
- Additional automation workflows:
  - `.github/workflows/deploy-manual.yml`
  - `.github/workflows/maintenance-scheduled.yml`
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

Required GitHub repository secret for Cloudflare deploy workflow:

- `CLOUDFLARE_API_TOKEN`

What they do:

- `Deploy Manual`
  - Runs the safe release pipeline from GitHub Actions
  - Optionally creates a CSV backup first
  - Uploads report artifacts
  - Opens or updates a GitHub issue if deployment fails
- `Maintenance Scheduled`
  - Runs the safe maintenance flow on a schedule
  - Uploads backup artifacts
  - Opens or updates a GitHub issue if maintenance fails

`CLOUDFLARE_ACCOUNT_ID` is embedded in `wrangler.toml` for Worker deploys and passed as a workflow environment value for Pages deploys.

## Frontend Notes

- Main source for Pages deploy is `.pages-deploy/`
- Root HTML/assets and `aaaa/` are synced mirrors for local checks
- Shared frontend logic lives in `.pages-deploy/assets/common.js`
- Page-specific logic is split by screen instead of keeping giant inline scripts

## Deploy Source Of Truth

- Worker runtime:
  - entrypoint: `worker.js`
  - route table: `server/routes.js`
- Pages frontend:
  - source of truth: `.pages-deploy/`
  - synced mirrors: root HTML/assets, `aaaa/`
- Database:
  - base schema: `schema.sql`
  - migration history: `migrations/*.sql`

If you change frontend files for production deploy, update `.pages-deploy/` first and then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-pages.ps1
```

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
