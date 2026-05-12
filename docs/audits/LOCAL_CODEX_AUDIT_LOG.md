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

## 2026-05-12 - Command dispatch create-only guard

Scope: LOW/MEDIUM governance workflow hardening for KOHEE command dispatch only.
Base: `main` at `cf43df845588fb01cb8999b742f47f17faa58ac6`
Commands: inspected `.github/workflows/kohee-command-dispatch.yml`, policy guard tests, and active queue.
Findings: dispatch still had create-or-update behavior for matching open KOHEE command issues, which could overwrite an active command ledger.
Changes: changed dispatch behavior to create-only; matching open command issues now fail the workflow instead of being updated. Added a policy guard so `github.rest.issues.update` cannot return unnoticed. Manual Codex trigger guidance remains.
Tests: PR #132 PR Validate and Validate passed before merge; main Validate and Deploy passed after merge.
Unresolved: command validator remains the next governance item.
Next action: correct ACTIVE_QUEUE from pending PR to merged evidence, then continue to command validator or read-only maintenance audit.

## 2026-05-12 - KOHEE command validator

Scope: LOW/MEDIUM governance validator rebuild without custom commit statuses.
Base: `main` at `b4f5a5257b0af5c5787c82b886b4ca3b61dc0576`
Commands: inspected KOHEE command templates, dispatch workflow, existing PR evidence check, and test runner.
Findings: command validator work should stay inside normal GitHub Actions checks and must not publish custom commit status contexts.
Changes: added `scripts/validate-kohee-command.mjs` and wired it into `npm run test:unit`. The validator checks KOHEE_COMMAND schema fields, state/risk/lane/HOLD vocabulary, dispatch create-only behavior, PR evidence fields, and absence of custom commit status publishing APIs in workflow/script/automation code.
Tests: PR #134 PR Validate and Validate passed before merge.
Unresolved: read-only maintenance audit remains the next non-destructive governance item after this validator PR.
Next action: correct ACTIVE_QUEUE from pending PR to merged evidence, then continue to read-only maintenance audit.

## 2026-05-12 - Read-only maintenance audit

Scope: MEDIUM governance/deploy-safety workflow narrowing for scheduled maintenance.
Base: `main` at `faec7cc85262e7a5e0616a108e7035f8edf1df2c`
Commands: inspected `scripts/auto-maintenance.ps1`, `.github/workflows/maintenance-scheduled.yml`, scheduled audit bridge, and active queue.
Findings: the scheduled maintenance workflow ran `auto-maintenance.ps1`, which can export CSV backup artifacts and create/update failure issues. That is too broad for the queued read-only maintenance audit.
Changes: added `scripts/audit-maintenance-readonly.mjs`, exposed `npm run audit:maintenance`, wired it into `npm run test:unit`, and narrowed `.github/workflows/maintenance-scheduled.yml` to read-only permissions and read-only audit execution.
Tests: local `node scripts/audit-maintenance-readonly.mjs`, `npm run check:deploy-sync`, `npm run audit:kohee`, `git diff --check`, and `npm run test:unit` passed. PR #136 PR checks passed after PR body evidence correction. Main Validate and Deploy passed on merge commit `9570b9e28cf6838c99a7e005a3230d307d88f9f8`; Deploy skipped Pages/Worker deploy and smoke steps.
Unresolved: Phase 3 safe issue-comment bridge remains the next non-destructive governance item.
Next action: correct ACTIVE_QUEUE from pending PR to merged evidence, then continue to Phase 3 safe issue-comment bridge.

## 2026-05-12 - Maintenance audit stable invariants

Scope: LOW governance/deploy-safety test robustness fix.
Base: `main` at `90e8f747259a1737a0293b155ec7c6631028b7c2`
Commands: inspected `scripts/audit-maintenance-readonly.mjs`, `docs/KOHEE_ACTIVE_QUEUE.md`, and previous PR #136/#137 evidence.
Findings: the read-only maintenance audit still asserted transient `KOHEE_ACTIVE_QUEUE.md` phrase text, so normal queue movement could break the audit even when the maintenance workflow remained safe.
Changes: removed the transient ACTIVE_QUEUE text assertion while keeping stable workflow/package/audit-log checks and required file existence checks.
Tests: local `node scripts/audit-maintenance-readonly.mjs`, `npm run check:deploy-sync`, `npm run test:unit`, `npm run audit:kohee`, and `git diff --check` passed. PR #141 checks passed. Main Validate and Deploy passed on merge commit `a2ca4cae4663df9a7c39504f62a2dcaf354e3d52`; Deploy skipped Pages/Worker deploy and smoke steps.
Unresolved: Cloudflare Worker observability audit is the next non-destructive audit-only item.
Next action: correct ACTIVE_QUEUE from pending PR to merged evidence, then continue to Cloudflare Worker observability audit.

## 2026-05-12 - Phase 3A dry-run KOHEE_STATUS parser

Scope: MEDIUM GitHub App Worker automation only; no GitHub writes, issue close, merge, auto-merge, deploy, D1/schema, auth/session, CSV, public `/data`, or production KOHEE runtime changes.
Base: `main` after PR #145 was merged.
Commands: inspected Phase 3 design and Worker policy/tests; `npx prettier --write` on touched Worker files; `npm run check:deploy-sync`; `npm run test:unit`; `npm run audit:kohee`; `git diff --check`.
Findings: Phase 3A can safely classify canonical `KOHEE_STATUS` comments on issue #23 as `RECORD_STATUS_DRY_RUN`; malformed canonical status is rejected; legacy Codex self-report comments still keep the prior `UNVERIFIED_PR_CLAIM` / HOLD behavior.
Changes: added canonical `KOHEE_STATUS` parsing and dry-run classification in the GitHub App Worker policy; included issue number in dry-run logs; expanded dry-run tests for accepted, rejected, HOLD, unsupported issue, edited comment, and live signed webhook paths.
Tests: `check:deploy-sync` passed; `test:unit` passed; `audit:kohee` passed; `git diff --check` passed.
Unresolved: GitHub PR checks, review threads, and main post-merge deploy/skip evidence still need verification after PR creation.
Next action: open the Phase 3A PR, verify GitHub evidence, merge only after checks and review threads pass.

## 2026-05-12 - Phase 3A merge evidence

Scope: docs-only evidence refresh after PR #146.
Base: `main` at `a319463f162656d94434a40b0d1bf0e05f426426`.
Commands: GitHub PR/check/review-thread reads; GitHub Actions run reads for PR and main push evidence.
Findings: PR #146 merged with commit `a319463f162656d94434a40b0d1bf0e05f426426`; changed files stayed inside `automation/github-app-worker/**` and docs; PR Validate run `25736240302` passed; PR Validate run `25736240241` passed; main Validate run `25736342234` passed; main Deploy run `25736342211` passed and skipped Pages/Worker deploy plus smoke steps.
Changes: refreshed `docs/KOHEE_ACTIVE_QUEUE.md` from pending Phase 3A work to completed evidence and moved next automation work to Phase 4A readiness audit.
Tests: this docs-only evidence refresh requires PR checks before merge.
Unresolved: Phase 3B status-comment writes remain HOLD/user-approved; Phase 4A is audit-only and must not enable auto-merge.
Next action: open and verify the docs-only evidence PR, then continue to Phase 4A readiness audit.

## 2026-05-12 - Phase 4A native auto-merge readiness audit

Scope: LOW audit-only; no auto-merge enablement, direct merge, branch delete, issue close, deploy, secrets, D1/schema, auth/session, CSV, public `/data`, server runtime, frontend runtime, or GitHub App write behavior change.
Base: `main` at `131e2c3c7c9f8f4b9a40bfe3e0bac5c77bfb2e47`.
Commands: inspected `docs/PHASE4_NATIVE_AUTOMERGE_DESIGN.md`, Worker policy/config, GitHub workflows, evidence scripts, repository metadata, public ruleset API, and recent PR #147 check evidence.
Findings: repository native auto-merge is available and `protect-main` is active with required `pr-validate` and `verify` checks plus review-thread resolution. Current Worker auto-merge output is dry-run only and flags remain disabled. KOHEE is not ready to enable auto-merge because Phase 4B LOW-only classifier tests and live PR evidence checks are still missing.
Changes: added `docs/audits/2026-05-12-phase4a-native-automerge-readiness-audit.md`; refreshed `docs/KOHEE_ACTIVE_QUEUE.md` to move next work to Phase 4B dry-run classifier tests.
Tests: pending for this PR; local verification should run `npm run check:deploy-sync`, `npm run test:unit`, `npm run audit:kohee`, and `git diff --check`.
Unresolved: Phase 4C native auto-merge enablement remains HIGH/HOLD and requires explicit owner approval.
Next action: open and verify this audit PR, then implement Phase 4B dry-run classifier tests only.
