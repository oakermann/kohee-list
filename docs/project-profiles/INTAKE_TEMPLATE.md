# Project Profile Intake Template

Status: intake template v0
Risk: LOW docs/profile

Purpose: collect the minimum information needed before a placeholder project can become a managed automation-platform project.

Do not route work to a project from this template alone. A project becomes routable only after a real project profile exists and passes validation.

## Required intake

```text
project:
repository_full_name:
default_branch:
local_path_policy:
active_lane:
active_queue:
task_queue:
allowed_low_medium_scope:
auto_merge_forbidden:
forbidden_areas:
required_checks:
deploy_allowed_by_default:
deploy_policy:
product_invariants:
owner_approval_required_for:
```

## Placeholder rules

- Missing repository data means `HOLD`.
- Missing local path policy means `HOLD`.
- Missing checks means `HOLD`.
- Missing forbidden areas means `HOLD`.
- Missing deploy policy means `HOLD`.
- Missing product invariants means `HOLD`.
- Any D1/schema/migration, auth/session/security, CSV import/reset, public data behavior, deploy/secrets, workflow, package-lock, or production setting ambiguity means `HOLD`.

## First placeholder projects

These projects remain placeholders until the required intake is complete:

- News app.
- Handover/internal work app.
- Blog/status site.

## Review format

Use:

```text
Status:
Blocker:
Next action:
Evidence:
```
