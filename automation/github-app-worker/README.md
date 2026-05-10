# KOHEE GitHub App Worker

Status: dry-run skeleton only  
Risk: LOW / GOVERNANCE

This directory contains an isolated dry-run skeleton for a future GitHub App + Cloudflare Worker automation helper.

It is not connected to production.
It does not deploy a Worker.
It does not install a GitHub App.
It does not register runtime credentials.
It does not write to GitHub.
It does not change KOHEE LIST runtime behavior.

## What exists now

```text
src/index.mjs
  Dry-run request handler.
  Exposes /health and /github/webhook.

src/security.mjs
  Webhook signature helper.
  Repository allowlist helper.
  Self-actor ignore helper.

src/policy.mjs
  Dry-run decision engine.
  Classifies safe LOW/MEDIUM PRs, high-risk PRs, and Codex issue comments.

test/dry-run.test.mjs
  Mock webhook and policy tests.
```

## Phase 2 purpose

Phase 2 is a future dry-run connection test.

The goal is only to verify that:

- webhook signatures can be verified,
- events can be parsed safely,
- repository allowlist enforcement works,
- self-authored events can be ignored,
- safe PR decisions are conservative,
- HIGH-risk PR decisions become HOLD,
- Codex comments without actual PR URLs are not trusted,
- no write action is executed.

## Example config

Use `wrangler.example.toml` as a reference only.

Do not copy it to the root `wrangler.toml`.
Do not deploy it until a separate approval step.

## Safe flags for any future dry-run deployment

Future deployment must start with write actions disabled:

```text
KOHEE_BOT_ENABLED=false
KOHEE_BOT_DRY_RUN=true
KOHEE_BOT_AUTO_MERGE_ENABLED=false
KOHEE_BOT_ISSUE_CLOSE_ENABLED=false
KOHEE_BOT_ALLOWED_REPOS=oakermann/kohee-list
```

If a flag is missing, the Worker should choose the safer behavior.

Runtime credential names and setup steps are intentionally omitted from this dry-run guide. They belong in a later approved setup runbook.

## Future GitHub App permissions

Start with read-only permissions.

Recommended for first dry-run installation:

```text
Metadata: read
Contents: read
Issues: read
Pull requests: read
Checks: read
Actions: read
```

Do not grant content-writing or administration-level permissions in the first dry-run phase.

Only later phases may add narrow issue or pull-request write permissions for mechanical status comments, issue cleanup, and native auto-merge enablement after a separate approval.

## Future webhook events

Start with the smallest set needed for dry-run observation:

```text
pull_request
issue_comment
issues
workflow_run
check_suite
pull_request_review
```

The handler must ignore events authored by the configured automation login unless the event is explicitly used for idempotent confirmation.

## Manual dry-run verification path

When a future deployment is explicitly approved, use this order:

```text
1. Deploy to a separate Cloudflare Worker name.
2. Keep KOHEE_BOT_ENABLED=false and KOHEE_BOT_DRY_RUN=true.
3. Send a signed mock webhook request.
4. Confirm /health returns dryRun=true.
5. Confirm a safe PR payload returns SAFE_AUTO_MERGE_ELIGIBLE.
6. Confirm a schema/migration/auth/public-data payload returns HOLD_HIGH_RISK.
7. Confirm a bot-authored payload returns IGNORE_SELF_EVENT.
8. Confirm no GitHub write action happened.
```

## Rollback and disable strategy

Any future live deployment must have immediate disable switches:

```text
KOHEE_BOT_ENABLED=false
KOHEE_BOT_AUTO_MERGE_ENABLED=false
KOHEE_BOT_ISSUE_CLOSE_ENABLED=false
```

If unexpected behavior appears:

```text
1. Disable the worker actions flag.
2. Pause the webhook connection.
3. Inspect Worker logs.
4. Keep all affected issues/PRs on HOLD until reviewed.
```

## Testing

The dry-run tests are wired into the root unit test script:

```powershell
npm run test:unit
```

Expected marker:

```text
[github-app-worker-dry-run] ok
```

## Do not do yet

Do not:

- install the GitHub App on production,
- deploy the Worker,
- register real runtime credentials,
- enable write permissions,
- enable issue close actions,
- enable auto-merge actions,
- add content-writing permissions.

Those require a separate approved phase.
