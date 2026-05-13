# Automation Platform Queue

Last updated: 2026-05-13
Purpose: active execution queue for the automation-platform lane.

## Rule

- This is the active queue while `docs/QUEUE_ROUTER.md` says `AUTOMATION_PLATFORM`.
- This queue starts from the current codebase state and carries automation through Phase 6.
- `docs/queues/KOHEE_PRODUCT.md` is paused until the Phase 6 maturity gate passes or the owner/ChatGPT explicitly defers this lane.
- Detailed grouping/order: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`.
- Extra hardening backlog: `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.
- Do not reorder this queue from supporting docs unless the owner/ChatGPT updates this file.
- The ten-point automation roadmap is queued below as follow-up work. It must not disturb the current Phase 5/6 order unless the owner/ChatGPT explicitly promotes it.

## Active lane

Automation Phase 6 path: current automation state → Phase 5 bridge → Phase 6 separation/control-plane foundation → Phase 6 hardening → maturity gate.

After the Phase 6 maturity gate, the lane can continue into the ten-point roadmap: evidence validation, recovery planning, decision logging, CI/CD posture, and repo-independent reuse.

## Current codebase baseline

The current repo already has earlier automation groundwork. Do not restart from zero.

Baseline to preserve:
- GitHub remains the source of truth for PRs, checks, review threads, issue state, and evidence.
- Prior status/comment bridge and dry-run classifier work is already part of the automation foundation.
- KOHEE product work remains paused while this automation lane is active.
- Existing HIGH/HOLD safety rules remain in force.

## Execution order

### 0. Merge / activate the queue split

Goal:
- Merge the PR that introduces the router and split queues.
- After merge, Local Codex starts from `AGENTS.md` → `docs/QUEUE_ROUTER.md` → this file.

Hard stop:
- Do not start KOHEE product work from this step.

### 1. Phase 5 bridge — local execution readiness

Goal:
- Bridge the current automation state into Phase 6 by making Local Codex task selection and stop rules reliable.

Expected output:
- Phase 5A local Codex worker runbook hardening.
- Task-pick rules and stop conditions clarified.
- Phase 5B local task picker dry-run plan.
- No unattended loop yet.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 4.

Hard stop:
- No background loop.
- No auto-merge enablement.
- No product feature work.

### 2. Phase 5 bridge — approval and notification readiness

Goal:
- Make HOLD/FIX_REQUIRED/approval-needed work visible before stronger automation.

Expected output:
- Approval notification bridge design.
- Phase 4C native auto-merge owner approval pack.
- Phase 5C local controlled worker loop owner approval pack.
- All stronger behavior remains HOLD until explicit owner approval.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 4.
- Relevant items in `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.

Hard stop:
- Do not enable native auto-merge.
- Do not enable unattended execution.

### 3. Automation Phase 6A — separation foundation

Goal:
- Separate automation-platform rules from KOHEE product rules before applying broad extra hardening.

Expected output:
- Automation platform vs KOHEE project boundary.
- Automation status schema.
- ChatGPT-first task intake and task queue schema.
- State transition policy.
- Project registry and catalog metadata.
- Governance and safety design.
- Future `dev-automation-platform` repo split plan.
- Shared templates, onboarding checklist, and golden path design.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phases 1–3.
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md` for input-trust and golden-path items.

Hard stop:
- Do not create the new repo yet unless explicitly approved.
- Do not move runtime automation code yet.
- Do not start KOHEE product work.

### 4. Automation Phase 6B — harden the separated platform

Goal:
- Apply additional hardening after Phase 6A has established the platform/product boundary.

Expected output:
- Local Codex execution hardening.
- Webhook idempotency and redelivery design.
- Task lease and heartbeat design.
- Reusable workflow baseline.
- Security and supply-chain posture.
- Observability and control board foundation.
- Extra hardening items grouped into scoped follow-up PRs.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phases 4–6.
- `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md`.

Hard stop:
- Planning/design/audit first.
- No stronger write/merge/control-board actions without explicit owner approval.

### 5. Automation Phase 6C — maturity gate

Goal:
- Decide whether the automation platform is ready to manage project implementation work.

Expected output:
- Confirm Phase 5 bridge work is accounted for.
- Confirm Phase 6A separation foundation exists.
- Confirm Phase 6B hardening docs exist or remaining items are explicitly scheduled.
- Confirm remaining HOLD items.
- Decide whether KOHEE product work can resume under the platform.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 7.

Hard stop:
- Do not resume KOHEE product work unless the maturity gate passes or the owner/ChatGPT explicitly defers the automation lane.

### 6. Ten-point roadmap — evidence validator

Goal:
- Make readiness and merge decisions depend on GitHub evidence instead of Codex self-report.

Expected output:
- Evidence validator plan for PR URL, head SHA, base branch, changed files, checks, review threads, issue links, risk labels, queue/lane match, and forbidden-file absence.
- Standard decision outputs: `MERGE`, `FIX`, `HOLD`, `NEXT`.

Hard stop:
- Do not merge from self-report.
- Do not enable auto-merge as part of this step.

### 7. Ten-point roadmap — recovery and decision log hardening

Goal:
- Make failed automation recoverable and auditable.

Expected output:
- PR rollback-note requirement.
- Last-known-good SHA tracking design.
- Failed PR history and blocked-lane history design.
- Automation decision log for ChatGPT/owner decisions.

Hard stop:
- No D1 or production recovery automation without separate owner approval.
- No production behavior changes without explicit approval.

### 8. Ten-point roadmap — CI/CD posture

Goal:
- Raise the automation platform toward ten-point operational maturity.

Expected output:
- Workflow permission review.
- GitHub Actions action-pinning review plan.
- High-risk workflow pattern audit plan.
- SLSA-lite/provenance/artifact-attestation feasibility note.
- OpenSSF Scorecard or equivalent posture review plan.

Hard stop:
- Do not change deployment credentials or production settings without explicit owner approval.
- Do not make noisy audit findings blocking until they are proven high-signal.

### 9. Ten-point roadmap — repo-independent platform generalization

Goal:
- Prepare the automation platform for reuse across KOHEE LIST, news app, blog/status site, and internal handover app.

Expected output:
- Separation of automation core rules from project-specific rules.
- Generic worker contract.
- Generic risk policy hooks.
- Queue router template.
- Evidence validator template.
- Merge policy template.
- Project registry/onboarding checklist for future repos.

Hard stop:
- Do not extract a new repository or move runtime code without explicit owner approval.
- KOHEE product queue remains paused unless the Phase 6 maturity gate passes or owner/ChatGPT explicitly defers this lane.

## After Phase 6

After the Phase 6 maturity gate, product work can resume from:

- `docs/queues/KOHEE_PRODUCT.md`

Initial paused product items:
- KOHEE admin review console Phase 2/3.
- KOHEE submissions review CSV Phase 2 audit/design.
- Future project prep for news app, blog/status site, and internal handover app.

Product work can also stay paused if the owner/ChatGPT chooses to continue the ten-point automation roadmap first.

## Merge decision rule

Use GitHub evidence, not Codex self-report.

MERGE:
- Active queue/lane match.
- Expected changed files only.
- Forbidden areas absent.
- Required checks pass.
- Review threads resolved or explicitly waived.
- Not HIGH/HOLD.
- Evidence report includes PR URL, head SHA, changed files, checks, review threads, issue state, and blocker status.

FIX:
- Safe scope, but incomplete docs, evidence, validation, wording, or fixable check result.

HOLD:
- Product work mixed into the automation lane.
- Deploy, D1, auth/session, CSV import/reset, or public `/data` behavior changed without explicit approval.
- Unattended loop or auto-merge enabled or implied.
- Extra hardening pulled into the active queue without owner/ChatGPT promotion.
- GitHub evidence insufficient.

NEXT:
- Current PR is merged or closed with a clear follow-up and the active queue can advance safely.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
