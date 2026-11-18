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
Coordinates are auto-filled from the address (`/api/geocode`, admin only). Coordinates outside South Korea (lat 33–39, lng 124–132) are refused on save.
'new' also has [한꺼번에 공개]: the candidates that already have coordinates, ticked in an in-page dialog, published through the
same path as one publish (`/api/publish-many`), with each row's result shown.

Report intake (`/api/submit`): an address equal (spaces ignored) to a public or waiting cafe is refused (409 "이미 등록된 카페입니다").
Otherwise the server looks the address up once on Kakao (address search only; the typed name is never sent); if the hit names the address's district (…시/군/구), lat/lng are stored and the
admin memo says `coords: kakao address, <matched address>`. A miss, other district, timeout, error or unset key stores nothing.
Reports stay candidates — nothing is published automatically.

Geocoding = `server/geocode.js`, the one place the provider lives (Kakao Local). The key is the Pages secret `KAKAO_REST_KEY`
(owner's Mac: `~/.config/secrets/kakao-rest-key`), sent only in the Authorization header. Without it intake skips the fill and
`/api/geocode` answers 503.

## Admin watch (owner's Mac)

`scripts/admin-watch.mjs`, launchd `com.oakermann.kohee-watch` daily 09:10, log `~/Library/Logs/kohee-watch.log`,
state `~/Library/Application Support/kohee-watch/` (outside the repo). Read-only: D1 SELECTs through wrangler and `/api/data`.

- New candidates (with names), reports and open error reports since the last run → one push through the Ohamma hub
  (`127.0.0.1:4096/notify`, as blueprint-check). User-typed text and `client_id` are never selected or pushed: reports and
  error reports are counts only.
- Health: every public cafe's range (lat = lng, outside South Korea, none); every cafe looked up on Kakao
  (listed place by name near the address, else the address) — farther than 100 m is flagged (11/18 measured on all 128:
  median 5 m, p95 24 m); not found on Kakao 2 runs in a row is flagged "closed?". Never unpublishes, only pushes.
- A finding or error is pushed once. `node scripts/admin-watch.mjs --dry-run` prints the push without saving state.
- Reinstall: `launchctl bootout gui/$(id -u)/com.oakermann.kohee-watch`, edit the plist, `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.oakermann.kohee-watch.plist`.
  The job runs the script from this working copy, so the checked-out branch must contain it.

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
