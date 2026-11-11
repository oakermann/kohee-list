# KOHEE LIST — working rules

Read `docs/KOHEE_MASTER_CONTEXT.md` first.

- Do not change the public condition (`approved AND deleted_at IS NULL`) or the public response columns — `scripts/test-api.mjs` guards them.
- Do not bring back accounts, sessions, IPs or cookie tracking. The only user identifier is the browser token (`client_id`).
- DB structure only via `migrations/`; production apply by hand after a backup (`d1-migrate.yml`). No automatic apply.
- Never commit backups, DB dumps or secrets (`npm run check:repo-safety`).
- Deploy = merge to main, automatic (`deploy.yml`). Production deploys from local only when the owner asks.
- Verify: `npm test`, `npm run format:check`, `git diff --check`. If the screen changed, run `wrangler pages dev` and click through it.
