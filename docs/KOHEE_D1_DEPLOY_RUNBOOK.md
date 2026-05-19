# KOHEE D1 And Deploy Runbook

Last updated: 2026-05-19

## D1 Migration Policy

- D1/schema/migration changes are HIGH/HOLD by default.
- Remote D1 migration requires explicit user approval.
- Remote D1 migration requires a backup and rollback plan first.
- D1 migrations are never auto-applied casually.
- GitHub Actions must not apply D1 migrations without explicit approval.

## Deploy Safety

- Normal deploys happen through GitHub Actions after merge to `main`.
- Local Cloudflare deploys require explicit user instruction.
- Do not change Cloudflare Pages/Worker production config, secrets, or deploy
  behavior in docs-only or contract work.

## Pages/Worker Expectations

- `.pages-deploy/` is the Pages deployment source of truth.
- Root HTML/assets are repository mirrors for validation.
- `worker.js` is the production Worker entrypoint.
- `server/**` contains Worker-side product behavior.

## Scheduled Smoke

The scheduled smoke workflow is product-only and read-only.

It must not:

- create issues
- comment on PRs
- dispatch tasks
- deploy
- write to production
- apply D1 migrations
- reference external OAP implementation details

It may run product safety checks and optional live smoke checks when safe URLs
are configured.

## Smoke Check Expectations

Smoke checks should verify:

- Pages respond with expected KOHEE markers.
- Worker health/version endpoints return safe shapes.
- Public data returns an array of public-safe cafe fields.
- Forbidden internal fields do not appear in public data.

## Release Verification

Expected commands:

```text
npm run check:deploy-sync
npm run test:unit
npm run audit:kohee
npm run verify:release
git diff --check
node scripts/detect-changed-areas.mjs --working-tree
```

## Rollback/Recovery Checklist

1. Identify the changed PR and merge commit.
2. Confirm whether runtime, D1, CSV, public data, auth/session, or deploy files
   were touched.
3. If production is affected, stop further changes and report HOLD.
4. Use Cloudflare/GitHub evidence, not local claims.
5. Prepare a scoped revert or forward fix.
6. Re-run release verification before merge.

## HOLD Conditions

Return HOLD for:

- missing approval for HIGH areas
- D1 migration or schema uncertainty
- auth/session/security risk
- public `/data` risk
- CSV import/reset risk
- deploy/secrets/production config risk
- conflicting docs
- unclear product behavior impact
- failed backup/rollback readiness
