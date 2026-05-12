# KOHEE Local Codex Audit Log

Purpose: record audits, fixes, and verification performed from local Codex environments.

Use this for:

- local repo checks
- local `gh` / `wrangler` readiness checks
- commands run locally
- files changed by local Codex
- local test results
- unresolved local blockers

Do not record:

- Cloudflare tokens
- GitHub tokens
- secret values
- cookies or sessions
- database dump contents
- passwords or first-admin codes

Keep entries concise. Link to PRs or commits instead of pasting long logs.

Entry format:

```text
## YYYY-MM-DD — Local Codex audit

Scope:
Base:
Commands:
Findings:
Changes:
Tests:
Unresolved:
Next action:
```

---

## 2026-05-11 — Initial placeholder

Scope: log structure only
Base: not run locally in this entry
Commands: none
Findings: local Codex audit records should be separated from design review and ChatGPT GitHub execution logs.
Changes: created this log file
Tests: GitHub PR checks for this docs-only change
Unresolved: first real local Codex audit still pending
Next action: when local Codex audits automation/KOHEE code, append a concise entry here.

## 2026-05-11 - Local Codex required checks audit

Scope: PR #109 required checks and ruleset triage
Base: local main fast-forwarded from `cf2d431` to `c2c30e2`
Commands: `git fetch origin main`, `git merge --ff-only origin/main`, attempted `gh auth status`, GitHub API ruleset reads, PR #109 check-run reads, PR #109 merge attempt
Findings: `gh` is not installed locally; GitHub ruleset `protect-main` requires `pr-validate` and `verify` from GitHub Actions app id `15368`; PR #109 has both check-runs successful on head SHA; merge API still reports required checks expected.
Changes: appended this docs-only audit evidence to PR #109 branch.
Tests: pending after push
Unresolved: ruleset/check association may require settings adjustment if fresh head checks still do not satisfy merge.
Next action: push the docs-only update, wait for checks, then retry merge.

## 2026-05-11 - GitHub App Worker Phase 2 dry-run readiness

Scope: GitHub App automation Worker dry-run readiness only; no production KOHEE Worker or Pages deploy.
Base: `main` at `cd426a52d27f0ec5cb847e4e6ff2067406470626`
Commands: `gh auth status`, `wrangler whoami`, `npm run check:deploy-sync`, `npm run test:unit`, `npm run audit:kohee`, `gh secret list`, `wrangler deploy --dry-run --config automation/github-app-worker/wrangler.toml`, `wrangler secret list --config automation/github-app-worker/wrangler.toml`, `git diff --check`
Findings: GitHub CLI auth works via local GitHub CLI install; Wrangler auth works; Worker config name is `kohee-github-app-worker-dry-run`; dry-run safety flags are disabled for writes, auto-merge, and issue-close; dry-run bundle validation passes.
Changes: no runtime change and no Worker deployment; this is a docs-only readiness record.
Tests: `check:deploy-sync` pass; `test:unit` pass; `audit:kohee` pass with warnings=0; `wrangler deploy --dry-run` pass; `git diff --check` pass.
Unresolved: Cloudflare reports Worker `kohee-github-app-worker-dry-run` is not created yet.
Next action: use repo secret `KOHEE_GITHUB_APP_WEBHOOK_SECRET`, align the workflow/app name, then run the manual dry-run Worker deployment workflow.

## 2026-05-11 - GitHub App Worker Phase 2 dry-run deploy

Scope: GitHub App automation Worker dry-run deploy and health verification; no production KOHEE Worker or Pages deploy.
Base: `main` at `2b0a29acdd6d5368cd6e1ad2dc1c33362195f504`
Commands: `gh workflow run`, `gh run watch`, `curl /health`, unsigned `/github/webhook` POST, `wrangler secret list`, issue #23 harmless comment test.
Findings: Dry-run Worker deployed; Worker secret `GITHUB_WEBHOOK_SECRET` exists; `/health` returns `ok=true`, `dryRun=true`, `botEnabled=false`; unsigned webhook is rejected with 401 invalid signature.
Changes: PR #111 aligned the GitHub Actions secret/app login; PR #112 corrected the actual Cloudflare account endpoint.
Tests: deploy workflow run `25649073122` passed; local release verification passed before PRs.
Unresolved: GitHub App delivery was not observed in Worker tail after the #23 test comment, likely because the GitHub App webhook URL still needs the actual account endpoint.
Next action: set GitHub App webhook URL to `https://kohee-github-app-worker-dry-run.gabefinder.workers.dev/github/webhook`, then redeliver or create another harmless issue/comment event.

## 2026-05-12 - PR #118 manager removal test repair

Scope: PR #118 legacy manager / manager_pick removal blocker.
Base: PR #118 head `046fa5b8e2d583551cbb4813f785ccee9c67a340`
Commands: `gh pr view 118`, `gh run view 25666142683 --log-failed`, `npm run test:unit`, required local verification.
Findings: PR #118 runtime behavior denied manager submission approval with 403; tests still expected legacy manager success and old `manager_pick` binding/header positions.
Changes: updated `scripts/test-unit.mjs` expectations only; kept `scripts/test-manager-role-removal.mjs` route-level manager denial unchanged.
Tests: `check:deploy-sync` pass; `test:unit` pass; `audit:kohee` pass; `verify:release` pass; `git diff --check` pass.
Unresolved: none expected if PR checks pass.
Next action: push PR #118 branch and verify GitHub checks.

## 2026-05-12 - GitHub App Worker webhook delivery check

Scope: Phase 2 dry-run webhook delivery verification; no production KOHEE Worker, Pages, D1, issue-close, or auto-merge changes.
Base: `main` at `3b7c9aa2959d136fc0ba1f9d7afc89594801c0d6`
Commands: `wrangler tail kohee-github-app-worker-dry-run`, dry-run Worker `/health`, harmless issue #23 comments.
Findings: dry-run Worker health returns `ok=true`, `dryRun=true`, `botEnabled=false`; Wrangler tail connects successfully. Two harmless issue_comment events were posted while tail was connected, but no Worker dry-run decision log appeared.
Changes: no runtime change; appended this audit record only.
Tests: PR #124 Validate/Deploy passed before this check; live dry-run Worker health passed.
Unresolved: GitHub App webhook delivery still appears not connected to the dry-run Worker.
Next action: verify the GitHub App webhook URL is `https://kohee-github-app-worker-dry-run.gabefinder.workers.dev/github/webhook`, then redeliver the issue_comment event from GitHub App settings and confirm a Worker dry-run decision log.

## 2026-05-12 - GitHub App Worker webhook delivery retry

Scope: Phase 2 dry-run webhook delivery retry after user reported webhook settings were updated.
Base: `main` at `6ab480335e3573781f5489cea1d1c95ece65aa23`
Commands: dry-run Worker `/health`, `wrangler tail kohee-github-app-worker-dry-run`, harmless issue #23 comments through GitHub connector and local `gh`.
Findings: dry-run Worker health still returns `ok=true`, `dryRun=true`, `botEnabled=false`; Wrangler tail connected successfully. Connector-created comment `4428615101` and local `gh` comment `4428631465` were posted while tail was connected, but no Worker dry-run decision log appeared.
Changes: no runtime change; appended this audit record only.
Tests: live dry-run Worker health passed; tail connection succeeded.
Unresolved: GitHub App webhook delivery still does not appear to reach the dry-run Worker after the settings update.
Next action: inspect GitHub App Recent deliveries for the latest issue_comment events and redeliver from GitHub App settings; record HTTP status/body if delivery fails.

## 2026-05-12 - GitHub App Worker issue_comment delivery verified

Scope: Phase 2 dry-run webhook delivery verification after the issue_comment event setting was enabled.
Base: `main` at `4d42c2db3a59e3ca150a0968fe277b6febdf7fe1`
Commands: dry-run Worker `/health`, `wrangler tail kohee-github-app-worker-dry-run`, local `gh issue comment 23`.
Findings: issue #23 comment `4428758548` reached the dry-run Worker as delivery `e9755cd0-4ddd-11f1-9dde-08393d66756c`; Worker emitted `decision=OBSERVE`, `wouldDo=["record_status"]`, `reasons=["no codex status marker detected"]`, `botEnabled=false`, `dryRun=true`.
Changes: no runtime change; appended this audit record and refreshed the active queue.
Tests: live dry-run Worker health passed; tail connection succeeded; webhook delivery logged successfully.
Unresolved: Phase 2 remains dry-run only; no issue comments, issue close, auto-merge, or repo writes are enabled.
Next action: continue to the commercial codebase gap audit or Phase 3 planning; do not enable writes without explicit approval.

## 2026-05-12 - Branch cleanup queue hygiene

Scope: LOW governance queue refresh after PRs #128, #129, and #130 were verified and merged.
Base: `main` at `bd4851361f07c9d77f09f7d7efdf0162bc5dabfe`
Commands: GitHub connector PR/issue reads, `gh run list`, `git branch -r --merged origin/main`, final read-only smoke and local checks from the prior audit pass.
Findings: open PRs were 0; issue #23 remained the active control issue; issue #94 remained the governance follow-up. Remote merged branch candidates existed, but automatic branch deletion is a HOLD item and was not performed.
Changes: refreshed `docs/KOHEE_ACTIVE_QUEUE.md` with merged PR #128/#129/#130 evidence and moved remote branch cleanup to `HOLD_USER_APPROVAL`.
Tests: pending in this PR; prior final main verification passed `check:deploy-sync`, `test:unit`, `audit:kohee`, `git diff --check`, GitHub Validate/Deploy, and read-only live smoke.
Unresolved: remote merged branches remain until the owner explicitly approves deletion.
Next action: verify this docs-only PR and merge after PR Validate / Validate pass.
