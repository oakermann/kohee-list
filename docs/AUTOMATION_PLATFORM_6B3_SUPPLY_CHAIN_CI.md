# Phase 6B-3 Supply Chain CI Contract

Date: 2026-05-13
Status: Phase 6B-3 design contract
Risk: LOW docs/governance

Purpose: define supply-chain and CI/CD posture for the automation platform without changing secrets, permissions, workflow settings, deployment settings, or dependency behavior in this PR.

Source relationship:
- Active queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Enterprise hardening map: `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`

No runtime behavior, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, dependency/package/lockfile/install-script, or public `/data` behavior is changed by this document.

## 1. Secrets and permission inventory

Inventory must identify:

| Area | Required inventory |
| --- | --- |
| GitHub Actions secrets | name, scope, repository/environment/org level, consumer workflow, rotation owner |
| Cloudflare tokens | token purpose, scope, allowed resources, expiry/rotation plan |
| deployment credentials | Pages/Workers deploy path, environment, approval requirement |
| D1-related credentials | read/write/migration ability, production access, manual approval requirement |
| GitHub App permissions | installation scope, repository access, write operations allowed |
| local credentials | gh/wrangler/local token presence, storage expectation, rotation note |

Rules:
- Do not print or store secret values.
- Inventory names and scopes only.
- Production-capable credentials require explicit owner/ChatGPT approval before use.
- Migration-capable credentials are HIGH/HOLD by default.

## 2. Workflow permission review

Every workflow should be classified by required permission.

Permission classes:

| Class | Description |
| --- | --- |
| read-only validation | checkout, install, test, audit, no write actions |
| PR metadata write | comments, labels, status updates, no code writes |
| branch write | creates/updates branches or files |
| deploy write | Pages/Workers deploy or production-affecting operations |
| migration write | D1/schema/data mutation |

Rules:
- Default workflow permissions should be minimal.
- Deploy and migration classes require explicit approval and separation from generic validation.
- `pull_request_target` is HOLD unless separately justified and approved.
- Workflows with secrets must not run untrusted code without a documented trust boundary.

## 3. Branch protection and ruleset inventory

Inventory must include:

| Field | Meaning |
| --- | --- |
| protected branch | branch or ruleset target |
| required checks | exact check names |
| required review | whether review is required |
| bypass actors | users/apps allowed to bypass |
| force push | allowed or blocked |
| deletion | allowed or blocked |
| auto-merge | enabled/disabled and approval state |
| stale approval policy | whether approvals dismiss on new commits |

Rules:
- Main branch protection drift must be reported before stronger automation is enabled.
- Bypass permissions require owner/ChatGPT approval and evidence.
- Required checks must include the current release verification path before product work resumes.

## 4. Third-party action risk scoring

Each third-party action should be reviewed before new adoption or major version change.

Scoring fields:

```text
action:
source:
pinned_by:
version_or_sha:
maintainer_health:
permission_required:
secret_access:
network_access:
risk:
review_result:
```

Rules:
- Prefer pinning actions to immutable SHAs for high-risk workflows.
- Version-only pinning may be acceptable for low-risk validation after review.
- Actions with secret access or deploy capability are MEDIUM/HIGH and require explicit evidence.

## 5. Dependency risk scoring

New dependencies require review before adoption.

Scoring fields:

```text
package:
ecosystem:
direct_or_transitive:
reason:
license:
maintainer_health:
known_vulnerabilities:
install_script_behavior:
lockfile_change:
runtime_or_dev_only:
risk:
review_result:
```

Rules:
- Package/lockfile/install-script changes are not LOW by default.
- Unknown or abandoned packages require HOLD or explicit approval.
- Runtime dependencies are higher risk than docs/dev-only tooling.
- Dependency review should be report-only before becoming blocking unless explicitly approved.

## 6. Build provenance and artifact attestation readiness

Future release evidence should connect:

```text
source PR:
head SHA:
base SHA:
workflow run ID:
job ID:
build command:
artifact ID or deployment ID:
release note:
rollback note:
```

Rules:
- Provenance work starts as documentation and evidence capture.
- Attestation or signing changes require separate approval.
- Deployment IDs should be recorded for production-affecting releases when available.

## 7. Config and infra drift audit

Drift audit should compare repo expectations with actual platform settings.

Targets:
- GitHub branch protection and rulesets.
- GitHub Actions required checks.
- GitHub App permissions.
- Cloudflare Pages settings.
- Cloudflare Workers routes/bindings.
- Cloudflare D1 bindings.
- Environment variables and secret scopes.
- Production/staging separation expectations.

Rules:
- Drift audit is read-only first.
- Do not change external settings in the audit PR.
- Any config fix becomes a separate PR or manual owner-approved action.

## 8. Incident freeze mode

Supply-chain incident freeze mode is entered when:
- a dependency/action/platform compromise is suspected.
- a secret or token exposure is suspected.
- production deployment integrity is uncertain.
- required checks are bypassed unexpectedly.
- branch protection/ruleset drift is detected in a high-risk area.

Freeze mode behavior:
- Stop dependency updates.
- Stop deploy/config changes.
- Continue read-only evidence collection.
- Record affected PRs and workflows.
- Resume only after owner/ChatGPT decision and evidence note.

## 9. Completion criteria

This lane is complete when:
- secrets and permission inventory fields are documented.
- workflow permission review classes are documented.
- branch protection/ruleset inventory fields are documented.
- third-party action risk scoring is documented.
- dependency risk scoring is documented.
- provenance/attestation readiness is documented.
- config/infra drift audit targets are documented.
- incident freeze mode is documented.
- no actual secrets, permissions, workflows, deployments, dependencies, or config are changed by this lane.
