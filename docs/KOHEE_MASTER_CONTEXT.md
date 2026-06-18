# KOHEE LIST Master Context

Last updated: 2026-05-19

KOHEE LIST is a product repository. OAP is maintained separately.

This document is the source of truth for KOHEE LIST product behavior, safety
rules, lifecycle rules, CSV policy, deployment risk handling, and product
backlog. When this document conflicts with older scattered notes, this document
takes precedence unless the user gives a newer explicit instruction.

## 1. Project Baseline

- Project: KOHEE LIST
- GitHub repo: `oakermann/kohee-list`
- Main branch: `main`
- Cloudflare Pages project: `kohee`
- Production service Worker: `kohee-list`
- Database: Cloudflare D1

KOHEE LIST is a curated, explainable cafe list. It is not a broad map app,
generic review app, ad directory, or uncontrolled cafe crawler.

## 2. Hard Safety Boundaries

Do not change these areas unless the user explicitly approves the exact product
change:

- D1 schema or migrations
- auth/session/security behavior
- CSV import/reset behavior
- public `/data` behavior
- cafe lifecycle behavior
- production deploy behavior
- secrets or production config

D1/schema/migration work is HIGH/HOLD by default. Plan first, back up first,
and never add automatic remote migration apply behavior without explicit
approval.

## 3. Core Product Invariants

Public cafe exposure:

- Public `/data` must only expose cafes where
  `status = 'approved' AND deleted_at IS NULL`.
- Candidate, hold/hidden, rejected, deleted, archived, duplicate-suspected, and
  internal-review records must not appear in public data.
- Public APIs must not expose submitter identity/contact, admin/operator
  identity, internal notes, selection reasons, evidence URLs, review memos, hold
  reasons, confidence/evidence level, duplicate flags, audit logs, or
  deleted/hidden metadata.

Cafe lifecycle:

- New cafe-like records default to candidate/hold, not public.
- Admin approval is required for public exposure.
- CSV import/reset must not directly publish approved cafes.
- `status=approved` from CSV stages as candidate unless a separate admin
  approval path is used.
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

- Allowed categories are `espresso`, `drip`, `decaf`, `instagram`, and
  `dessert`.
- Categories represent verified strengths, not mere menu existence.
- Drip/espresso require stronger coffee-specific evidence or admin
  confirmation.
- Existing original CSV `decaf` tags are treated as user-verified and preserved
  unless explicitly told otherwise.
- `instagram` is for spaces where the space itself is a meaningful reason to
  visit, not just a minor interior detail.

## 4. CSV And Review Workflow Policy

CSV is a review workflow artifact, not a direct public overwrite mechanism.

Required CSV concepts:

- User submissions export remains separate from cafe review exports.
- Candidate/hold/approved review exports preserve original fields and add
  suggested/review fields.
- Reviewed CSV upload must not auto-approve public records.
- Protected fields must not be overwritten from review CSV: `id`,
  `submission_id`, `created_at`, submitter fields, `admin_reply_message`,
  `deleted_at`, and direct approved/public status.
- Suggestions may be staged, not blindly applied.

Review result fields should track review decision, recommended status, review
memo, changed fields, hold reason, admin check requirement, original/suggested
tags, category review notes, original/suggested menu, original/suggested
description, duplicate status, public leak risk, and confidence note.

## 5. Deployment And D1 Safety

- GitHub Actions handles normal deploys after merge to `main`.
- Local Cloudflare deploys require explicit user instruction.
- Do not change existing production Pages/Worker/D1 deploy behavior during
  docs/tooling cleanup.
- D1 changes are manual-review only: plan first, backup/runbook first, no
  automatic remote migration, no migration in GitHub Actions without explicit
  approval.

## 6. Product Backlog

Current product candidates:

1. KOHEE admin review console Phase 2/3.
2. KOHEE submissions review CSV Phase 2 design/audit.
3. Safer smoke-check split for destructive/admin assumptions.
4. Legacy manager compatibility cleanup planning.

HOLD/HIGH candidates:

1. Remove manager from D1 schema role CHECK.
2. Improve `resetCsv` atomicity with staging/transaction design.
3. Design evidence DB with cafe evidence and category verification.
4. Reviewed CSV apply/import workflow.

## 7. Required Validation

For product-safe repository work, run:

```text
npm run check:deploy-sync
npm run test:unit
npm run verify:release
git diff --check
```

Use `npm run audit:kohee` when product invariants, governance references, or
safety checks are touched.
