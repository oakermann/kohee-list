# Phase 6B-4 Recovery Rollback Contract

Date: 2026-05-13
Status: Phase 6B-4 design contract
Risk: LOW docs/governance

Purpose: define release checklist, rollback runbook, last-known-good SHA, evidence archive, failed PR history, incident/postmortem process, and recovery drills for the automation platform.

Source relationship:
- Active queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Enterprise hardening map: `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`

No runtime behavior, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, dependency/package/lockfile/install-script, or public `/data` behavior is changed by this document.

## 1. Release checklist

Every production-affecting release should have a checklist before merge or deployment.

Required fields:

```text
release_id:
release_type:
source_pr:
head_sha:
base_sha:
changed_files:
risk_level:
forbidden_areas_touched:
required_checks:
review_threads:
deploy_target:
smoke_required:
rollback_note:
known_risks:
owner_or_release_approval:
```

Release checklist rules:
- Docs-only automation PRs may use the normal evidence report.
- Runtime, deploy, D1/schema, auth/session, CSV import/reset, public `/data`, workflow, secret, or dependency changes require an explicit risk note.
- Missing release checklist for production-affecting work is FIX_REQUIRED.
- Missing approval for HIGH/HOLD release work is HOLD.

## 2. Rollback runbook

Rollback is not a single command. Choose the path by changed area.

| Changed area | Default rollback path | Notes |
| --- | --- | --- |
| docs only | revert PR or follow-up docs PR | usually LOW |
| frontend static assets | revert PR and redeploy Pages if needed | smoke Pages after rollback |
| Worker code | revert PR and redeploy Worker if needed | record Worker deployment/version evidence |
| workflow config | revert PR, verify required checks, inspect ruleset impact | may be HIGH |
| secrets/credentials | rotate or revoke secret, do not rely on git revert | HIGH/HOLD |
| D1/schema/data | follow D1 restore/migration runbook | git revert may not restore data |
| auth/session/security | revert code plus invalidate/rotate affected state if needed | HIGH/HOLD |
| CSV import/reset | stop imports, inspect data impact, use backup/restore policy | HIGH/HOLD |
| public `/data` behavior | revert code and verify public API field exposure | HIGH/HOLD |

Rollback report template:

```text
Status:
Blocker:
Next action:
Evidence:
- incident/release id:
- rollback target:
- last known good SHA:
- revert PR:
- deployment id/version:
- data restore needed:
- smoke checks:
- owner approval:
- remaining risk:
```

## 3. Last-known-good SHA policy

A last-known-good SHA is the most recent commit known to be safe for a specific lane or release target.

Required fields:

```text
scope:
sha:
source_pr:
verified_checks:
verified_smoke:
known_limitations:
recorded_at:
recorded_by:
```

Rules:
- Last-known-good SHA must be scope-specific: docs, Pages, Worker, automation docs, or data-related work.
- Do not use a docs-only last-known-good SHA as proof for runtime safety.
- D1/data safety requires backup/restore evidence, not only a git SHA.
- If no last-known-good SHA exists, rollback report must say so explicitly.

## 4. Cloudflare rollback and deployment evidence

Cloudflare rollback evidence should record what was actually deployed.

Fields to capture when available:

```text
cloudflare_project:
deployment_type:
pages_deployment_id:
worker_deployment_id:
worker_version_id:
route_or_environment:
deployed_sha:
deployment_time:
rollback_target:
```

Rules:
- Cloudflare rollback may not revert external state such as D1 data, secrets, KV/R2 content, or environment settings.
- Worker/Pages rollback must be followed by smoke checks.
- Deployment evidence must be tied back to PR and head SHA.
- If deployment ID is unavailable, record the limitation.

## 5. D1 backup and restore drill policy

D1/data recovery must be treated separately from code rollback.

Minimum policy:
- Record backup location and timestamp outside the repository.
- Keep schema-only backup distinct from data backup.
- Record restore command or manual procedure in a protected runbook.
- Run restore drill in non-production before trusting the process.
- Production restore requires owner/ChatGPT approval and incident note.

Restore drill result template:

```text
drill_id:
environment:
backup_timestamp:
restore_target:
commands_or_steps:
verification_query:
result:
issues_found:
follow_up:
```

## 6. Evidence archive and decision log

Evidence used for merge, release, rollback, and override decisions must be preserved.

Minimum records:
- PR URL and number.
- base SHA and head SHA.
- changed files.
- checks and workflow run IDs.
- review thread state.
- approval or waiver note.
- release checklist if applicable.
- rollback note if applicable.
- final decision: MERGE, FIX, HOLD, NEXT, ROLLBACK, or CLOSE.

Rules:
- Evidence should be append-only in spirit.
- Do not store secret values or private data in evidence logs.
- If evidence is incomplete, record the missing item explicitly.

## 7. Failed PR and blocked-lane history

Failed or held work should leave a trail.

Required fields:

```text
pr_or_task:
lane:
status:
blocking_reason:
failed_check_or_thread:
changed_files:
owner_decision:
follow_up:
closed_or_fixed_at:
```

Rules:
- A failed PR should not disappear without a follow-up or reason.
- A blocked lane should record whether it is blocked by policy, missing evidence, owner approval, checks, or external access.
- Repeated failure in the same lane should trigger a lane-level review before more automation is added.

## 8. Incident response and postmortem

Incident severity draft:

| Severity | Meaning | Default action |
| --- | --- | --- |
| SEV1 | public outage, data exposure, destructive production issue | freeze, rollback/mitigate, owner approval |
| SEV2 | degraded public/admin function or failed deploy with impact | mitigate, communicate, follow-up PR |
| SEV3 | internal automation or docs/process issue with no user impact | fix in normal queue |

Incident first response:
1. Stop risky automation actions.
2. Identify affected scope.
3. Preserve evidence.
4. Decide freeze/rollback/mitigation.
5. Record owner/incident lead decision.
6. Communicate status if users/admins are affected.

Postmortem template:

```text
incident_id:
severity:
summary:
timeline:
impact:
root_cause:
what_worked:
what_failed:
action_items:
owners:
due_dates:
prevention:
```

## 9. Release notes and changelog requirements

Release notes should separate operator-facing and user-facing changes.

Fields:

```text
release_id:
source_prs:
user_visible_changes:
operator_changes:
risk_notes:
migration_notes:
rollback_notes:
known_issues:
```

Rules:
- User-facing release notes must not expose internal security details or secrets.
- Operator release notes should include risk and rollback notes.
- Schema/data changes require explicit migration and rollback/restore notes.

## 10. Completion criteria

This lane is complete when:
- release checklist is documented.
- rollback runbook is documented.
- last-known-good SHA policy is documented.
- Cloudflare rollback/deployment evidence is documented.
- D1 backup/restore drill policy is documented.
- evidence archive and decision log are documented.
- failed PR and blocked-lane history are documented.
- incident response and postmortem are documented.
- release notes/changelog requirements are documented.
- no runtime, deployment, credential, D1/schema, auth/session, CSV, or public `/data` behavior is changed by this lane.
