# KOHEE Constitution

Last updated: 2026-05-19

This is the highest-level product constitution for KOHEE LIST.

## Product Identity

KOHEE LIST is a curated cafe selection product. It is not a broad map app,
generic review site, advertising directory, uncontrolled crawler, or raw cafe
database.

The product should stay small, explainable, and review-driven. Public entries
must represent intentional selection, not mere ingestion.

## Public Data

- Public `/data` exposes only cafes where `status='approved' AND deleted_at IS NULL`.
- Candidate, hidden/hold, rejected, deleted, duplicate-suspected, archived, or internal-review records must never appear in public data.
- Candidate/public data separation is mandatory.
- Admin approval is required before a cafe becomes publicly visible.

Public APIs must never expose:

- internal notes
- evidence URLs
- confidence levels
- submitter identity or contact
- admin/operator identity
- review memos
- hold reasons
- deleted or hidden metadata
- audit logs

## CSV And Submissions

- CSV import/reset must not directly publish cafes.
- CSV `status=approved` must not bypass explicit admin approval.
- Submission acceptance or review processing does not equal public approval.
- Reviewed CSV must never automatically publish cafes.

## HIGH/HOLD Areas

These changes are HIGH/HOLD unless explicitly scoped and approved:

- D1/schema/migrations
- auth/session/security
- public data behavior
- CSV import/reset behavior
- cafe lifecycle behavior
- deploy/secrets/production config

Docs-only cleanup must not change product runtime behavior.

## Roles

- Target runtime roles are `admin` and `user`.
- Do not add new role systems.
- Do not add `super_admin`.
- Do not expand legacy `manager` behavior.
- `manager` may appear only as legacy wording if it already exists in product copy or compatibility notes.

## Categories

Allowed categories are:

- `espresso`
- `drip`
- `decaf`
- `instagram`
- `dessert`

Categories must be based on verified strengths or intentional curation, not mere
menu presence.

## Repository Boundary

OAP platform implementation must not live in this repo. Do not add OAP task
packet systems, watchers, bridges, GitHub App workers, project profiles,
decision-record engines, control-plane dry-runs, auto-merge bots, branch
deletion, or issue-close automation here.
