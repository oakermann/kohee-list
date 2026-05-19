## Summary

## Risk

LOW / MEDIUM / HIGH / HOLD

## Changed files

## Product safety checklist

- [ ] No unintended product runtime behavior change.
- [ ] No D1/schema/migration change.
- [ ] No auth/session/security behavior change.
- [ ] No CSV import/reset behavior change.
- [ ] No public `/data` behavior change.
- [ ] No cafe lifecycle behavior change.
- [ ] No Cloudflare deploy behavior or production config change.
- [ ] No secrets or credentials touched.

## Tests

- [ ] `npm run check:deploy-sync`
- [ ] `npm run test:unit`
- [ ] `npm run verify:release`
- [ ] `git diff --check`

## Remaining risks
