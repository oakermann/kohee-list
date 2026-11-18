# KOHEE LIST — system source of truth

Cafe curation site. One address (https://kohee.pages.dev); one Cloudflare Pages project (`kohee`) serves
the screen (`site/`) and the API (`functions/api` → `server/`) together, bound directly to D1 (`kohee-list`).
No worker, accounts, sessions or IP collection (2026-10-21, migration 0011).

## Data

| Table           | What                                                   |
| --------------- | ------------------------------------------------------ |
| `cafes`         | public cafes, candidates and user reports in one table |
| `error_reports` | error reports and operator answers (same row)          |
| `settings`      | main notice                                            |

Cafe states:

- **public** = `status = 'approved' AND deleted_at IS NULL` — the only condition for showing on the site (`/api/data`)
- **candidate** = `status = 'candidate'` — admin entries, CSV, user reports (with `client_id`)
- **removed** = `deleted_at` set — discarded reports, unpublished cafes. Restoring returns the original state; only removed ones can be deleted for good
- Publishing needs coordinates (lat/lng) — coordinate 0 silently drops out of 'near me'

Public responses never expose the ops memo, reporter token, report reason or status columns (`scripts/test-api.mjs` guards this).

## People

- **Users**: no login. Saved cafes live only in the browser (localStorage). Reports and error reports carry a random
  browser-made token (`client_id`); the same browser's 'saved / my reports' shows results and answers.
  Flooding is stopped by a site-wide daily cap (`SUBMIT_DAILY_CAP`) — reports only show once the admin publishes them anyway.
- **Admin**: one password (Pages secret `ADMIN_PASSWORD`). Login gives an `expiry.signature` cookie (HttpOnly, Secure,
  SameSite=Strict, signing key = password). Changing the password invalidates every cookie.
  `wrangler pages secret put ADMIN_PASSWORD --project-name kohee`

## Ops console (`/admin`)

Home = ops (choose a column): new [publish][discard] · public [unpublish] · removed [restore][delete for good] ·
error reports · notice · CSV import · visitors (Cloudflare Web Analytics). Tapping a card edits it.
Coordinates are auto-filled from the address (`/api/geocode`, Nominatim, admin only — 1 request/s policy). Coordinates outside South Korea (lat 33–39, lng 124–132) are refused on save.

CSV import = new cafes only, as candidates. Cafes with the same address (spaces ignored) are skipped, and if any row is invalid
nothing is inserted (batch). There is no path that edits existing cafes.

## Deploy

- PR and main: `.github/workflows/check.yml` — `npm test`, formatting, repo safety (no backups or DB files committed)
- Merge to main: `deploy.yml` — Pages deploy + `npm run smoke:check` (live site)
- Pushes that include DB structure changes (`migrations/`, `schema.sql`) are not deployed: back up
  (`wrangler d1 export kohee-list --remote`) → `d1-migrate.yml` (apply) → run Deploy manually
- Screen files are `Cache-Control: no-cache` (revalidated every time, 304 if unchanged) — do not bump `?v=`

## Local

```
npx wrangler d1 execute kohee-list --local --file <backup.sql>   # or --file schema.sql
npx wrangler d1 migrations apply kohee-list --local
npx wrangler pages dev site --binding ADMIN_PASSWORD=<anything>   # http://127.0.0.1:8788
SITE_URL=http://127.0.0.1:8788 npm run smoke:check
```
