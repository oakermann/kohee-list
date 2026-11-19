# KOHEE LIST

Cafe curation site — https://kohee.pages.dev

Source of truth: [docs/KOHEE_MASTER_CONTEXT.md](docs/KOHEE_MASTER_CONTEXT.md) (data, people, ops console, deploy, local)

```
site/            screen (HTML, CSS, JS, _headers)
functions/api/   Pages function → hands off to server/app.js
server/          API: app (entry), routes, admin (lock), cafes, errorReports, csv, geocode (Kakao), shared
migrations/      D1 migrations (applied by hand only)  ·  schema.sql full schema
scripts/         test-api (real SQL), test-site (static screen), smoke-check (live site),
                 check-repo-safety, admin-watch (daily read-only check on the owner's Mac)
```

`npm test` · `npm run format:check` · `npm run smoke:check`
