# Phase 4A Native Auto-Merge Readiness Audit

Date: 2026-05-12
Status: VERIFIED audit-only
Lane: GOVERNANCE / DEPLOY_SAFETY
Risk: LOW audit-only

## Scope

This audit checks whether KOHEE LIST is ready to consider a later native GitHub auto-merge implementation for safe LOW-risk PRs.

This audit did not enable auto-merge automation, change repository settings, write GitHub App behavior, delete branches, close issues, deploy, or touch D1/schema, auth/session, CSV, public `/data`, server runtime, frontend runtime, or production secrets.

## Evidence Checked

- Repository: `oakermann/kohee-list`
- Repository setting from GitHub connector: `allow_auto_merge=true`
- Repository ruleset API: active ruleset `protect-main`, id `16136128`
- Ruleset target: default branch
- Ruleset enforcement: `active`
- Ruleset branch rules:
  - deletion denied
  - non-fast-forward denied
  - pull request rule active
  - required review thread resolution enabled
  - required approving review count is `0`
  - allowed merge methods: `merge`, `squash`, `rebase`
  - required status checks: `pr-validate`, `verify`
- PR #147 evidence:
  - PR #147 changed docs only and merged through GitHub
  - PR Validate run `25736615055` passed with job `pr-validate`
  - Validate run `25736615084` passed with job `verify`
  - no unresolved review threads
- Main after PR #147:
  - merge commit `131e2c3c7c9f8f4b9a40bfe3e0bac5c77bfb2e47`
  - Validate run `25736673236` passed
  - Deploy run `25736673198` passed
  - Pages/Worker deploy and smoke steps were skipped for docs-only changes
- Local repository scan:
  - `automation/github-app-worker/wrangler.toml` has `KOHEE_BOT_AUTO_MERGE_ENABLED = "false"`
  - `automation/github-app-worker/wrangler.example.toml` has `KOHEE_BOT_AUTO_MERGE_ENABLED = "false"`
  - no direct merge API, branch delete, native auto-merge mutation, or custom status publishing implementation was found in `.github`, `scripts`, or `automation`
  - current Worker policy can emit `wouldDo=["enable_native_auto_merge"]` only as a dry-run decision

## Readiness Assessment

KOHEE is partially ready for a later native auto-merge path, but not ready to enable it yet.

Positive signals:

- GitHub repository native auto-merge is available.
- The active `protect-main` ruleset requires PR flow, required review thread resolution, and required checks.
- Required check names are concrete and stable in recent PR evidence: `pr-validate` and `verify`.
- Recent safe docs/tooling PRs have consistently passed PR Validate and Validate before merge.
- Phase 3A dry-run status parsing is merged and tested.
- Existing GitHub App Worker flags remain write-disabled and auto-merge-disabled.

Blocking gaps before enablement:

- Phase 4B classifier tests do not exist yet.
- The current dry-run pull request classifier is too broad because it treats MEDIUM tooling/docs PRs as `SAFE_AUTO_MERGE_ELIGIBLE`; the Phase 4 design requires LOW-only eligibility.
- The current dry-run classifier does not inspect actual check conclusions, review submissions, unresolved review threads, mergeability, draft state from live PR metadata, or current ruleset evidence.
- Branch protection endpoint returned `401` without authentication; the public ruleset endpoint was usable, but any future implementation should use authenticated GitHub evidence reads.
- Repository ruleset requires `0` approving reviews, so review-thread resolution and Codex/GitHub check evidence become more important if LOW-only auto-merge is later enabled.
- GitHub App write permissions and `KOHEE_BOT_AUTO_MERGE_ENABLED` must remain disabled until explicit owner approval.

## Recommendation

Do not enable native auto-merge yet.

Next safe step is Phase 4B dry-run classifier tests only:

- classify only LOW docs/test/audit/tooling PRs as eligible dry-run candidates
- reject or hold MEDIUM/HIGH, draft, conflict, missing-check, failing-check, missing `KOHEE_STATUS`, malformed evidence, unresolved thread, requested-changes, and denylisted-file PRs
- require actual GitHub PR URL and head SHA evidence
- require `pr-validate` and `verify` success from GitHub evidence
- keep `KOHEE_BOT_AUTO_MERGE_ENABLED=false`
- do not call auto-merge, direct merge, issue close, branch delete, deploy, or repository-settings APIs

Phase 4C native auto-merge enablement remains HIGH/HOLD and requires explicit owner approval after Phase 4B proves the dry-run classifier is conservative.
