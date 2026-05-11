# GitHub App Worker Phase 2 Dry-Run Setup

Status: ready for external setup after merge  
Risk: HIGH / AUTOMATION_CONNECTIVITY  
Last updated: 2026-05-10

This runbook connects the existing GitHub App Worker skeleton to a real Cloudflare Worker and GitHub App webhook in dry-run mode only.

Phase 2 does not write repo contents, close issues, enable auto-merge, apply D1 migrations, or change KOHEE LIST runtime behavior.

## What Phase 2 changes

After Phase 2, GitHub events can reach the dry-run automation Worker:

```text
GitHub event -> GitHub App webhook -> Cloudflare Worker /github/webhook -> dry-run decision JSON
```

The bot still does not perform write actions.

## Files involved

- `automation/github-app-worker/src/index.mjs`
- `automation/github-app-worker/src/security.mjs`
- `automation/github-app-worker/src/policy.mjs`
- `automation/github-app-worker/wrangler.toml`
- `.github/workflows/deploy-github-app-worker-dry-run.yml`

## Required GitHub repository secrets

Register these GitHub Actions secrets before running the deploy workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `KOHEE_GITHUB_APP_WEBHOOK_SECRET`

Use a dedicated webhook secret value. Do not reuse account passwords, API tokens, or app private keys as the webhook secret.

## GitHub App setup

Create a GitHub App for dry-run automation.

Recommended app name:

- `kohee-list-automation`

Webhook URL after the Worker is deployed:

```text
https://kohee-github-app-worker-dry-run.workers.dev/github/webhook
```

Webhook secret:

- Same value as `KOHEE_GITHUB_APP_WEBHOOK_SECRET`.

### Minimum permissions for Phase 2 dry-run

Use the smallest useful permissions:

- Metadata: read
- Contents: read
- Issues: read
- Pull requests: read
- Checks: read
- Actions: read

Do not grant initially:

- Contents: write
- Administration: write
- Secrets: write
- Deployments: write
- Actions: write

### Webhook events for Phase 2

Enable only these events first:

- Pull request
- Issue comment
- Issues
- Check suite
- Workflow run
- Pull request review

## Deploy dry-run Worker

After this PR is merged and secrets are registered:

1. Open GitHub Actions.
2. Run `Deploy GitHub App Worker Dry Run` manually.
3. Enter confirmation:

```text
deploy-dry-run-bot
```

Expected result:

- Worker deployed to `kohee-github-app-worker-dry-run.workers.dev`.
- `GITHUB_WEBHOOK_SECRET` registered as a Cloudflare Worker secret.
- `/health` returns JSON.
- No repo write actions occur.

## Health check

Expected:

```bash
curl https://kohee-github-app-worker-dry-run.workers.dev/health
```

Expected fields:

- `ok: true`
- `service: kohee-github-app-worker`
- `dryRun: true`
- `botEnabled: false`

## Dry-run safety flags

`automation/github-app-worker/wrangler.toml` currently sets:

```toml
KOHEE_BOT_ENABLED = "false"
KOHEE_BOT_DRY_RUN = "true"
KOHEE_BOT_AUTO_MERGE_ENABLED = "false"
KOHEE_BOT_ISSUE_CLOSE_ENABLED = "false"
KOHEE_BOT_ALLOWED_REPOS = "oakermann/kohee-list"
```

These must stay conservative during Phase 2.

## Validation after GitHub App install

Trigger harmless events and confirm Worker responses/logs:

- Open/edit a test issue.
- Add a test issue comment.
- Open a docs-only test PR if needed.
- Confirm high-risk PRs classify as HOLD.
- Confirm comments without PR URLs classify as unverified when they claim `PR_OPEN`.
- Confirm bot-authored events are ignored.

## Must not happen in Phase 2

The bot must not:

- Create commits.
- Open PRs.
- Merge PRs.
- Enable auto-merge.
- Close issues.
- Add issue comments unless a later Phase 3 PR explicitly allows it.
- Apply D1 migrations.
- Touch KOHEE LIST app runtime behavior.

## Move to Phase 3 only after

Proceed only if dry-run evidence is stable:

- No invalid webhook signatures accepted.
- Repo allowlist works.
- Self-event ignore works.
- Dry-run decisions match expectations.
- No false-positive safe decisions on HIGH-risk changes.
- GitHub App permissions are still minimal.

## Codex execution prompt

Paste this into Codex only after this PR is merged:

```text
TASK: KOHEE GitHub App Worker Phase 2 deployed dry-run setup.

MODE: HIGH / AUTOMATION_CONNECTIVITY / NO KOHEE RUNTIME CODE CHANGES.

REPO: oakermann/kohee-list on main.

GOAL:
Connect the existing GitHub App Worker dry-run skeleton to real GitHub + Cloudflare in dry-run mode only, so GitHub events reach the Cloudflare Worker and produce dry-run decisions. Do not enable issue closing, auto-merge, repo writes, content writes, or production app behavior changes.

ALLOWED:
- Create/configure a GitHub App for KOHEE dry-run automation.
- Install the GitHub App only on oakermann/kohee-list.
- Configure webhook URL to the dry-run Worker endpoint.
- Register GitHub Actions secrets needed by .github/workflows/deploy-github-app-worker-dry-run.yml.
- Run the manual workflow Deploy GitHub App Worker Dry Run with confirm=deploy-dry-run-bot.
- Verify /health and webhook dry-run behavior.
- Record evidence in #23.

DENY:
- Do not modify KOHEE app runtime code.
- Do not change Cloudflare Pages/kohee-list app Worker deploy flow.
- Do not grant Contents write, Administration write, Secrets write, Actions write, or Deployments write to the GitHub App.
- Do not enable issue close or auto-merge actions.
- Do not apply D1 migrations.
- Do not add OpenAI API calls.
- Do not claim live automation is enabled beyond dry-run decisions.

REQUIRED SECRETS:
- GitHub Actions secret CLOUDFLARE_API_TOKEN
- GitHub Actions secret CLOUDFLARE_ACCOUNT_ID
- GitHub Actions secret KOHEE_GITHUB_APP_WEBHOOK_SECRET

GITHUB APP PERMISSIONS FOR PHASE 2:
- Metadata read
- Contents read
- Issues read
- Pull requests read
- Checks read
- Actions read

WEBHOOK EVENTS:
- Pull request
- Issue comment
- Issues
- Check suite
- Workflow run
- Pull request review

STEPS:
1. Confirm PR with .github/workflows/deploy-github-app-worker-dry-run.yml and automation/github-app-worker/wrangler.toml is merged into main.
2. Create/configure GitHub App kohee-list-automation with the exact Phase 2 read-only permissions above.
3. Install it only on oakermann/kohee-list.
4. Register webhook URL: https://kohee-github-app-worker-dry-run.workers.dev/github/webhook.
5. Use the same webhook secret value as KOHEE_GITHUB_APP_WEBHOOK_SECRET.
6. Register the three required GitHub Actions secrets.
7. Run GitHub Actions workflow Deploy GitHub App Worker Dry Run with confirm=deploy-dry-run-bot.
8. Verify https://kohee-github-app-worker-dry-run.workers.dev/health returns ok=true, dryRun=true, botEnabled=false.
9. Trigger harmless test events and inspect dry-run decisions/logs.
10. Comment results on issue #23 with exact evidence.

REPORT FORMAT:
- GitHub App name:
- Installed repo:
- Permissions granted:
- Webhook URL:
- Cloudflare Worker URL:
- GitHub Actions workflow run URL:
- Health check result:
- Dry-run event tests performed:
- Any errors:
- Confirmation that no write actions/auto-merge/issue close were enabled:
```
