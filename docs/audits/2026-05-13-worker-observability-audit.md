# Cloudflare Worker Observability Audit

Date: 2026-05-13
Risk: LOW audit-only
Track: LOCAL_TRACK
Lane: AUTOMATION_CONNECTIVITY / DEPLOY_SAFETY

## Scope

Inspect the dry-run GitHub App Worker logging and observability posture, then
recommend whether to add Cloudflare Workers Logs configuration.

This audit does not deploy, register secrets, enable GitHub writes, enable
native auto-merge, close issues, delete branches, change D1/schema/migrations,
change auth/session/security, change CSV import/reset, or change public `/data`
behavior.

## Sources

- Cloudflare Workers Logs docs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- Cloudflare Wrangler configuration docs: https://developers.cloudflare.com/workers/wrangler/configuration/#observability
- Repo evidence:
  - `automation/github-app-worker/wrangler.toml`
  - `automation/github-app-worker/wrangler.example.toml`
  - `automation/github-app-worker/src/index.mjs`
  - `.github/workflows/deploy-github-app-worker-dry-run.yml`
  - `automation/github-app-worker/README.md`

## Findings

1. `automation/github-app-worker/wrangler.toml` has no `[observability]`
   section. It currently defines the dry-run Worker name, entrypoint,
   compatibility date, workers.dev routing, and safe dry-run vars only.

2. `automation/github-app-worker/wrangler.example.toml` also has no
   `[observability]` section, so the example config does not teach future
   operators to persist Worker decision logs.

3. The Worker already emits structured JSON decision logs through
   `emitDryRunLog()` in `automation/github-app-worker/src/index.mjs`. The log
   includes a stable type marker, timestamp, event, delivery ID, repository,
   action, actor, decision, reasons, high-risk files, `botEnabled`, and
   `dryRun` fields. That is a good shape for Workers Logs.

4. The manual dry-run deploy workflow deploys the Worker, registers the webhook
   secret, verifies `/health`, and writes a summary. It does not enable or
   verify persistent Workers Logs. This audit does not change that workflow.

5. Cloudflare's current docs describe Workers Logs as the native way to persist
   Worker invocation logs, custom logs, errors, and exceptions. The Wrangler
   config uses an `observability` block with `enabled` and optional
   `head_sampling_rate`.

6. The dry-run automation Worker is low volume and operationally important.
   Losing decision logs would make webhook delivery and classifier debugging
   harder, especially while native auto-merge remains HOLD and evidence comes
   from GitHub checks, review threads, and Worker dry-run decisions.

## Recommendation

Add Workers Logs configuration in a separate LOW, config-only PR:

```toml
[observability]
enabled = true
head_sampling_rate = 1
```

Apply the same non-secret observability block to:

- `automation/github-app-worker/wrangler.toml`
- `automation/github-app-worker/wrangler.example.toml`

Use `head_sampling_rate = 1` for the dry-run Worker while traffic is low. If
the Worker becomes noisy, reduce the sampling rate in a later config-only PR.

## Not Recommended Now

- Do not add Tail Workers yet.
- Do not add Workers Logpush yet.
- Do not add OpenTelemetry export yet.
- Do not run the dry-run deploy workflow from this audit.
- Do not change webhook behavior or GitHub write behavior.

## Acceptance For Follow-Up Config PR

- Add only the `[observability]` blocks and any short README note needed.
- Keep all dry-run safety flags disabled for writes, native auto-merge, and
  issue close.
- Run `npm run check:deploy-sync`, `npm run test:unit`, `npm run audit:kohee`,
  and `git diff --check`.
- Open a scoped PR and let GitHub PR checks verify it.
- Do not deploy from Codex.
