# KOHEE LIST Master Context

Last updated: 2026-05-10

This document is the source of truth for KOHEE LIST automation, safety rules, lifecycle rules, CSV policy, deployment risk handling, and current backlog. When this document conflicts with older scattered notes, this document wins unless the user gives a newer explicit instruction.

## 1. Project baseline

- Project: KOHEE LIST / 코히리스트
- GitHub repo: `oakermann/kohee-list`
- Main branch: `main`
- Cloudflare Pages project: `kohee`
- Production service Worker: `kohee-list`
- Database: Cloudflare D1
- GitHub App automation Worker is separate from the production service Worker.

KOHEE LIST is a curated, explainable cafe list. It is not a broad map app, generic review app, ad directory, or uncontrolled cafe crawler.

## 2. Current automation operating model

The current operating model is ChatGPT-main.

- ChatGPT GitHub connector is the main executor and orchestrator.
  - Creates branches.
  - Edits files.
  - Opens pull requests.
  - Reads changed files, diffs, checks, and review threads.
  - Resolves review threads when appropriate.
  - Merges safe PRs after evidence is verified.
  - Updates issues and records status.
- GitHub Actions is the validation and deploy gate.
  - PR Validate / Validate
  - `npm run test:unit`
  - `npm run audit:kohee`
  - evidence checks where configured
  - release/deploy verification
- Codex is reviewer, analysis support, and PATCH_READY support.
  - Codex may inspect, review, propose patches, or prepare branch work when explicitly used.
  - Codex is not the default source of truth for completion.
  - Codex Cloud self-reports are never accepted as final evidence.
- GitHub App + Cloudflare Worker automation is the future GitHub execution layer for reducing manual approval clicks.
  - It must follow ChatGPT decisions and GitHub evidence.
  - It is not a replacement for the GitHub Actions gate.
  - It must stay dry-run until explicitly promoted.

Trust boundary:

- Trust actual GitHub evidence:
  - real PR URL
  - head SHA
  - changed files
  - checks
  - review threads
  - workflow results
  - issue state/comments
- Do not trust by itself:
  - Codex Cloud self-report
  - local branch name
  - local commit claim
  - `make_pr` metadata without actual PR URL
  - task-local text claiming completion without GitHub evidence

## 3. Parallel execution policy

Default: parallelize LOW/MEDIUM work when it is safe to parallelize.

Allowed parallel work:

- docs-only
- wording-only
- audit-only
- isolated tests/guards
- isolated tooling
- independent frontend copy changes
- independent governance documentation
- LOW/MEDIUM tasks with non-overlapping files and non-overlapping risk areas

Parallel work requirements:

1. Use a batch parent issue when related tasks are grouped.
2. Each lane must declare risk, scope, files, denylist, verification, and merge order.
3. Deny same-file overlaps across parallel lanes.
4. Deny shared-test-file overlap such as `scripts/test-unit.mjs` unless the lanes are intentionally merged into one PR.
5. Rebase or update branches after upstream merges when needed.
6. Merge PRs sequentially, never all at once.
7. Re-run checks after upstream merges if the branch may be stale.
8. ChatGPT must verify GitHub evidence before reporting completion.

Do not parallelize:

- HIGH/HOLD work
- D1/schema/migrations
- auth/session/security
- public `/data` or public API exposure behavior
- CSV import/reset semantics
- destructive data behavior
- Cloudflare production deploy workflow/secrets
- GitHub App + Cloudflare control-plane Phase 2 connection
- manager role removal policy work when it touches shared auth/server/tests
- any tasks touching the same files

LOW/MEDIUM parallel PRs may use native auto-merge only after changed files, checks, and review-thread requirements are satisfied. Merge order still matters.

## 4. Risk lanes

LOW:

- docs-only
- comment-only
- wording-only
- small UI copy with no permission/data behavior
- audit-only reports
- isolated tests/guards that do not change runtime behavior

MEDIUM:

- frontend rendering cleanup
- server refactor with no behavior change
- route clarity with no permission expansion
- export-only CSV additions
- automation policy/tooling changes that do not enable writes
- handler cleanup after tests prove behavior

HIGH:

- D1 schema/migrations
- auth/session/secrets/roles/permissions
- public `/data` and public API behavior
- CSV import/reset or reviewed CSV apply behavior
- destructive data behavior
- production deploy workflow/secrets
- GitHub App write enablement
- auto-merge bot enablement
- issue-close bot enablement
- physical legacy manager schema cleanup
- resetCsv atomicity changes
- evidence database design or migration

HOLD means do not implement until the user explicitly approves.

## 5. Core product invariants

Public cafe exposure:

- Public `/data` must only expose cafes where `status = 'approved' AND deleted_at IS NULL`.
- Candidate, hold/hidden, rejected, deleted, archived, duplicate-suspected, and internal-review records must not appear in public data.
- Public APIs must not expose:
  - submitter identity/contact
  - admin/operator identity
  - internal notes
  - selection reasons
  - evidence URLs
  - review memos
  - hold reasons
  - confidence/evidence level
  - duplicate flags
  - audit logs
  - deleted/hidden metadata

Cafe lifecycle:

- New cafe-like records default to candidate/hold, not public.
- Admin approval is required for public exposure.
- CSV import/reset must not directly publish approved cafes.
- `status=approved` from CSV stages as candidate unless a separate admin approval path is used.
- Hold rows are `status='hidden' AND hidden_at IS NOT NULL`.
- Legacy imported hidden rows are `status='hidden' AND hidden_at IS NULL`.
- Recoverable deletion is preferred over hard deletion.
- Purge is separate HIGH-risk work.

Roles:

- Target runtime role model is `admin` and `user`.
- Legacy `manager` may remain in D1/schema as a migration concern only.
- Do not expand manager behavior.
- Do not add `super_admin`.

Categories:

- Allowed categories are `espresso`, `drip`, `decaf`, `instagram`, and `dessert`.
- Categories represent verified strengths, not mere menu existence.
- Drip/espresso require stronger coffee-specific evidence or admin confirmation.
- Existing original CSV `decaf` tags are treated as user-verified and preserved unless explicitly told otherwise.
- `instagram` is for spaces where the space itself is a meaningful reason to visit, not just a minor interior detail.

## 6. CSV and review workflow policy

CSV is a review workflow artifact, not a direct public overwrite mechanism.

Required CSV concepts:

- user submissions export remains separate from cafe review exports.
- candidate/hold/approved review exports preserve original fields and add suggested/review fields.
- reviewed CSV upload must not auto-approve public records.
- protected fields must not be overwritten from review CSV:
  - id/submission_id
  - created_at
  - submitter fields
  - admin_reply_message
  - deleted_at
  - direct approved/public status
- Suggestions may be staged, not blindly applied.

Review result fields should track:

- review_decision
- recommended_status
- review_memo
- changed_fields
- hold_reason
- admin_check_required
- tags_original/tags_suggested
- category-specific review notes
- recommended_menu_original/recommended_menu_suggested
- description_original/description_suggested
- duplicate_status/duplicate_with/duplicate_reason
- public_leak_risk
- confidence_note

## 7. Deployment and D1 safety

- GitHub Actions handles normal deploys after merge to `main`.
- Local Cloudflare deploys require explicit user instruction.
- GitHub App automation Worker is separate from the production KOHEE service Worker.
- Do not change existing production Pages/Worker/D1 deploy behavior during automation docs work.
- D1 changes are manual-review only:
  - plan first
  - backup/runbook first
  - no automatic remote migration
  - no migration in GitHub Actions without explicit approval

D1/schema/migration changes are HIGH/HOLD unless explicitly approved.

## 8. GitHub App + Cloudflare Worker automation phases

Phase 2: deployed dry-run connection.

- Prepared in repo by PR #85.
- Must be run locally with authenticated `gh` and `wrangler`.
- Do not run from Codex Cloud.
- No write actions.
- No issue close.
- No auto-merge.
- No production runtime/D1/auth/CSV/public data change.
- Expected Worker:
  - `kohee-github-app-worker-dry-run`
  - `/health`
  - `/github/webhook`
- Safety flags:
  - `KOHEE_BOT_ENABLED=false`
  - `KOHEE_BOT_DRY_RUN=true`
  - `KOHEE_BOT_AUTO_MERGE_ENABLED=false`
  - `KOHEE_BOT_ISSUE_CLOSE_ENABLED=false`
  - `KOHEE_BOT_ALLOWED_REPOS=oakermann/kohee-list`

Phase 3:

- Safe issue comment/close automation may be considered.
- Still no broad repo write or risky behavior.

Phase 4:

- Native auto-merge enabling for safe LOW/MEDIUM PRs may be considered.
- Checks/review threads/denylist remain the gate.

HIGH-risk automation remains user-approved.

## 9. Current operational state

As of 2026-05-10:

- Open PRs: 0
- Open control issue: `#23`
- Open HIGH/HOLD issues: 0 known
- No active failed PR
- Current work queue is clean except planned backlog
- `#23` remains the long-lived manual maintenance control issue.

Important completed PRs:

- #79: stopped scheduled Codex maintenance fan-out and switched to single #23 manual control issue
- #81: removed legacy manager runtime/admin access
- #82: synced manager removal docs
- #83: redacted user-facing operator usernames
- #84: synced findings ledger
- #85: prepared GitHub App Worker Phase 2 dry-run files
- #86: removed legacy manager frontend role label
- #88: added policy guard tests for manager/route/redaction regressions

Closed/unmerged:

- #87: handler-internal manager access cleanup attempt; closed because legacy tests expected manager direct handler 200 responses. Retry requires test rewrite.

## 10. Current backlog

P0:

1. Keep automation model corrected to ChatGPT-main.
2. Keep this master context updated.
3. Encode LOW/MEDIUM parallel execution policy in docs/contracts.
4. GitHub App + Cloudflare Worker Phase 2 dry-run connection is deferred until the user explicitly starts it.

P1:

1. Retry handler-internal manager removal with test rewrite.
   - `server/cafes.js`
   - `server/submissions.js`
   - `server/errorReports.js`
   - `scripts/test-unit.mjs`
2. Strengthen handler-level audit/policy guards after the test rewrite.
3. Change user-facing `manager_pick` / 매니저픽 copy to `운영진픽` without DB rename.

P2:

1. Add dry-run Worker observability/structured decision logs.
2. Centralize automation denylist policy.
3. Add issue lifecycle label policy.

HOLD/HIGH:

1. Remove manager from D1 schema role CHECK.
2. Improve resetCsv atomicity with staging/transaction design.
3. Design evidence DB:
   - `cafe_evidence`
   - `category_verifications`
   - review memo
   - source URL
   - confidence/evidence level

## 11. Patch tracking format

When a problem, risk, or patch candidate is found, record it in this format:

```text
[P0/P1/P2/HOLD] Title
- Risk:
- Current evidence:
- Recommended patch:
- Do not touch:
- Next Codex/PR candidate:
```

## 12. Completion reporting rule

Before reporting completion, verify actual GitHub state:

- PR URL
- head SHA
- changed files
- diff/patch
- GitHub checks
- review threads
- risk lane
- HIGH denylist
- deploy status when relevant

If this verification was not performed, report the work as unverified.
