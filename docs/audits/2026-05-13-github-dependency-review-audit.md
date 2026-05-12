# GitHub Dependency Review Audit

Date: 2026-05-13
Risk: LOW audit-only
Track: LOCAL_TRACK
Lane: DEPLOY_SAFETY / SUPPLY_CHAIN

## Scope

Inspect whether `actions/dependency-review-action` is useful for KOHEE PRs and
whether a future workflow change would be low-noise and compatible with current
rulesets.

This audit does not add a workflow, change required checks, deploy, enable
GitHub writes, close issues, delete branches, change D1/schema/migrations,
change auth/session/security, change CSV import/reset, or change public `/data`
behavior.

## Sources

- GitHub dependency review docs:
  https://docs.github.com/en/code-security/concepts/supply-chain-security/about-dependency-review
- GitHub dependency review action:
  https://github.com/actions/dependency-review-action
- GitHub dependency review action configuration:
  https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configuring-the-dependency-review-action
- Repo evidence:
  - `package.json`
  - `package-lock.json`
  - `.github/workflows/pr-validate.yml`
  - `.github/workflows/validate.yml`
  - `.github/CODEOWNERS`
  - `scripts/detect-changed-areas.mjs`

## Current Repo Evidence

1. The repository is public, so dependency review is available without a private
   repository GitHub Code Security / Advanced Security requirement.

2. The dependency surface is currently tiny: `package.json` has only one
   devDependency, `prettier`, and `package-lock.json` locks only that package.

3. `pr-validate.yml` already runs `npm ci`, unit tests, `audit:kohee`, KOHEE PR
   evidence checks, and `git diff --check` on pull requests.

4. `validate.yml` runs the broader release verification on push, pull request,
   and manual dispatch.

5. There is no current dependency-review-action workflow.

6. `package.json` is CODEOWNERS-protected, and `scripts/detect-changed-areas.mjs`
   already treats `package.json` and `package-lock.json` as deploy/tooling
   signal files.

## Findings

1. The dependency review action is useful for KOHEE only when a PR changes
   `package.json` or `package-lock.json`. Most current docs/audit automation PRs
   would not benefit from running it.

2. Adding dependency review to every PR would be unnecessary noise because the
   repository usually changes docs, scripts, Worker dry-run policy, or frontend
   files rather than dependencies.

3. A dedicated path-filtered workflow would be low-noise and compatible with
   current rulesets because it would run only for dependency manifest/lockfile
   changes and would not need `pull-requests: write`.

4. The official dependency-review-action README currently shows `@v5`; it also
   notes that v5 uses the Node 24 runtime and requires a recent Actions Runner.
   GitHub-hosted runners satisfy that requirement for KOHEE's normal Actions
   usage.

5. The action's default `fail-on-severity` is `low`, which is stricter than
   KOHEE needs for an initial low-noise rollout. A future workflow should start
   at `high` or `moderate`, then tighten only after stable evidence.

6. The action can post PR comments, but enabling comment summaries requires
   `pull-requests: write`. KOHEE should keep the first rollout read-only and use
   job logs/summaries only.

## Recommendation

Add a separate LOW workflow PR only if dependency review is wanted as an
optional supply-chain check:

```yaml
name: Dependency Review

on:
  pull_request:
    paths:
      - package.json
      - package-lock.json
      - .github/dependency-review-config.yml

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Dependency Review
        uses: actions/dependency-review-action@v5
        with:
          fail-on-severity: high
          fail-on-scopes: runtime, development
          license-check: false
          comment-summary-in-pr: never
```

Keep the workflow optional at first. Do not add it to required checks until it
has passed on at least one dependency-change PR and the owner confirms the
signal/noise tradeoff is acceptable.

## Not Recommended Now

- Do not add dependency review directly to `pr-validate.yml`.
- Do not make dependency review a required check yet.
- Do not enable PR comment summaries.
- Do not introduce license allow/deny policy until KOHEE has an explicit
  dependency license policy.
- Do not run dependency review on docs-only, frontend-only, Worker policy-only,
  or governance-only PRs.

## Follow-Up Acceptance

For a later LOW workflow PR:

- Touch only `.github/workflows/dependency-review.yml` and optional short docs.
- Keep permissions at `contents: read`.
- Use path filters for dependency manifest/lockfile changes.
- Run `npm run check:deploy-sync`, `npm run test:unit`, `npm run audit:kohee`,
  and `git diff --check`.
- Let GitHub PR checks validate the workflow PR.
- Do not deploy or change rulesets from Codex.
