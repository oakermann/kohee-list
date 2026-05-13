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

## Active lane

Automation Phase 6 path: current automation state → Phase 5 bridge → Phase 6 separation/control-plane foundation → Phase 6 hardening → maturity gate.

## Current codebase baseline

The current repo already has earlier automation groundwork. Do not restart from zero.

Baseline to preserve:
- GitHub remains the source of truth for PRs, checks, review threads, issue state, and evidence.
- Prior status/comment bridge and dry-run classifier work is already part of the automation foundation.
- KOHEE product work remains paused while this automation lane is active.
- Existing HIGH/HOLD safety rules remain in force.

## Ten-point roadmap mapping

The ten-point automation design is mapped into the existing Phase 5 / Phase 6 order.

- Phase 5 bridge:
  - Local Codex worker contract/runbook hardening.
  - Dry-run picker plan.
  - Evidence-based decision system:
    - GitHub evidence validator.
    - MERGE / FIX / HOLD / NEXT criteria.
    - Evidence-first approval/report format.
    - Low/medium PR exercise loop using real PRs before stronger automation.
- Phase 6A separation foundation:
  - Automation-platform rules separated from KOHEE-product rules.
  - Project registry, task schema, state transition policy, reusable onboarding/template direction.
- Phase 6B hardening:
  - Supply-chain and CI/CD posture:
    - Workflow permission review.
    - Action-pinning review plan.
    - High-risk workflow-pattern audit plan.
    - Protected environment approval gate design.
    - Provenance/attestation/SLSA-lite feasibility.
    - OpenSSF Scorecard or equivalent baseline review.
    - Dependency-change gate.
    - Lifecycle/install-script policy.
    - Lockfile/package-manager-change review.
    - Token-rotation checklist.
    - Supply-chain incident freeze mode.
  - Recovery and rollback auditability:
    - Rollback note.
    - Last-known-good SHA tracking.
    - Failed PR / blocked-lane history.
    - Automation decision log.
  - Operational verification plan for repeated safe Local Codex runs before unattended behavior is considered.
- Phase 6C maturity gate:
  - Verify evidence-based decision flow works.
  - Verify recovery/rollback auditability is concrete.
  - Verify dependency/install safeguards are concrete.
  - Verify the platform can safely manage project work before KOHEE_PRODUCT resumes.
- After Phase 6:
  - If the owner/ChatGPT keeps the automation lane active, continue repo-independent generalization for news app, blog/status site, and internal handover app reuse.

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
- Local Codex worker runbook hardening.
- Local worker contract for task pick → risk check → minimal patch → validation → PR → evidence report.
- Task-pick rules and stop conditions clarified.
- Dry-run picker plan.
- Evidence-based decision system drafted from GitHub evidence.
- Low/medium PR exercise plan to test the evidence → decision loop using real PRs before stronger automation.
- No unattended loop yet.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 5 bridge.

Hard stop:
- No background loop.
- No auto-merge enablement.
- No product feature work.

### 2. Phase 5 bridge — approval and notification readiness

Goal:
- Make HOLD/FIX_REQUIRED/approval-needed work visible before stronger automation.

Expected output:
- Approval notification bridge design.
- Native auto-merge owner approval pack.
- Local controlled worker loop owner approval pack.
- Evidence-first owner approval/report format.
- Explicit rule that auto-merge or unattended execution remains HOLD until the low/medium PR exercise loop is proven and owner-approved.
- All stronger behavior remains HOLD until explicit owner approval.

Reference:
- `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` Phase 5 bridge.
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
- Clear split between reusable automation core rules and KOHEE-specific rules.

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
- Protected environment approval gate design.
- Supply-chain and CI/CD posture bundle.
- Recovery and rollback auditability bundle.
- Required evidence that auditability fields are captured somewhere concrete before maturity gate pass.
- Operational verification plan for repeated safe Local Codex runs, including at least three low/medium PRs processed with evidence-based MERGE/FIX/HOLD/NEXT decisions.
- Observability and control board foundation.
- Extra hardening items grouped into scoped follow-up PRs.

Hard stop:
- Planning/design/audit first.
- No stronger write/merge/control-board actions without explicit owner approval.
- Do not change deployment credentials or production settings without explicit owner approval.
- Do not make noisy audit findings blocking until they are proven high-signal.
- Do not treat dependency/package changes as LOW by default.

### 5. Automation Phase 6C — maturity gate

Goal:
- Decide whether the automation platform is ready to manage project implementation work.

Expected output:
- Confirm Phase 5 bridge work is accounted for.
- Confirm local execution readiness and evidence-based decision planning exist.
- Confirm the low/medium PR exercise loop has been run or is explicitly scheduled with a blocker.
- Confirm Phase 6A separation foundation exists.
- Confirm Phase 6B hardening docs exist or remaining items are explicitly scheduled.
- Confirm dependency/install safeguards are present or explicitly scheduled.
- Confirm recovery and rollback auditability is concrete enough to be used.
- Confirm remaining HOLD items.
- Confirm evidence-based MERGE / FIX / HOLD / NEXT flow is usable from GitHub evidence.
- Decide whether KOHEE product work can resume under the platform.

Hard stop:
- Do not resume KOHEE product work unless the maturity gate passes or the owner/ChatGPT explicitly defers the automation lane.
- Do not pass the maturity gate on design-only claims if the evidence loop, recovery/auditability coverage, dependency/install safeguards, and HOLD list are not concrete.

## After Phase 6

After the Phase 6 maturity gate, product work can resume from:

- `docs/queues/KOHEE_PRODUCT.md`

Initial paused product items:
- KOHEE admin review console Phase 2/3.
- KOHEE submissions review CSV Phase 2 audit/design.
- Future project prep for news app, blog/status site, and internal handover app.

If the owner/ChatGPT keeps `AUTOMATION_PLATFORM` active after the maturity gate, continue repo-independent platform generalization before resuming product work.

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
- Maturity gate claims without concrete evidence-loop and recovery/auditability coverage.
- Dependency/package changes are treated as LOW without explicit justification.
- Ecosystem-level dependency incident occurs and incident freeze mode has not been evaluated.

NEXT:
- Current PR is merged or closed with a clear follow-up and the active queue can advance safely.

## Reporting rule

Use only:

```text
Status / Blocker / Next action / Evidence
```
