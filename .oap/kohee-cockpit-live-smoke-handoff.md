# KOHEE Cockpit Live Smoke Handoff

Date: 2026-06-05

Scope: managed-project handoff only. This patch does not merge, deploy, create a
PR, run production smoke, print secrets, or change product behavior.

## Managed Project Target

- Repository: `oakermann/kohee-list`
- Branch target: `main`
- Existing entry point: GitHub Actions workflow `KOHEE Scheduled Smoke`
- Trigger mode: manual `workflow_dispatch` from the cockpit-managed project
- Required non-secret variables for live smoke:
  - `KOHEE_PAGES_URL`
  - `KOHEE_WORKER_URL`

## Safe Live-Smoke Path

The workflow already runs repository validation before optional live smoke:

- `npm run check:deploy-sync`
- `npm run test:unit`
- `npm run verify:release`

If both live-smoke variables are configured, the workflow runs
`npm run smoke:check`, which maps to `node scripts/smoke-check.mjs`.

The live smoke is read-only and checks:

- Pages public HTML
- Pages admin HTML marker
- Worker `/health`
- Worker `/health/db`
- Worker `/version`
- Worker public `/data` response shape

## Guardrails

- Do not run `scripts/smoke-test.ps1` from the cockpit live-smoke project; it
  exercises signup/login/admin paths and remote D1 cleanup.
- Do not deploy Pages or Worker from this handoff.
- Do not run migrations, schema changes, D1 writes, CSV reset/import, or
  remediation from the managed project.
- Do not print secrets or environment values.
- If the live-smoke variables are absent, keep the existing skip behavior.
- If public `/data` shape fails, return evidence and hold for product review.

## Evidence To Return

- Workflow run URL
- Commit SHA tested
- Result for each validation step
- Result for optional `npm run smoke:check`
- Any failing check name and first non-secret error line
