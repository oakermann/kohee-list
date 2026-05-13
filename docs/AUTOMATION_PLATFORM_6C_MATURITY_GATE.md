# Phase 6C Maturity Gate

Date: 2026-05-13
Status: Phase 6C maturity review
Risk: LOW docs/governance

Purpose: decide whether the automation platform is mature enough to resume KOHEE product work under the platform, or whether the automation lane must remain active.

Source relationship:
- Active queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Local execution rules: `docs/LOCAL_CODEX_RUNBOOK.md`
- Enterprise hardening map: `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`
- 6B lane contracts: `docs/AUTOMATION_PLATFORM_6B*.md`

No runtime behavior, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, dependency/package/lockfile/install-script, monitoring integration, auto-merge, unattended loop, or public `/data` behavior is changed by this document.

## 1. Gate decision

Current default decision:

```text
HOLD_PRODUCT_RESUME
```

Meaning:
- The automation platform has enough governance/design coverage to proceed toward implementation planning.
- KOHEE product work should not automatically resume from this document alone.
- Product work resumes only after owner/ChatGPT explicitly accepts the maturity gate result or explicitly defers the automation lane.
- Unattended loop, native auto-merge, direct merge bot behavior, production deployment changes, credential changes, D1/schema changes, auth/session changes, CSV import/reset changes, and public `/data` behavior changes remain HOLD.

## 2. Evidence checklist

Gate evidence must be based on repository and GitHub evidence, not Codex self-report.

| Area | Required evidence | Current expected source |
| --- | --- | --- |
| router/source of truth | active lane and active queue exist | `docs/QUEUE_ROUTER.md`, `docs/queues/AUTOMATION_PLATFORM.md` |
| local execution readiness | task-pick, dry-run, evidence, approval, stop rules exist | `docs/LOCAL_CODEX_RUNBOOK.md` |
| Phase 6A separation | platform/product boundary and schema drafts exist | `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` |
| Phase 6B lane split | hardening lanes are split and ordered | `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` |
| enterprise gap map | enterprise gaps are mapped to 6B lanes | `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md` |
| 6B-1 | trust/policy/approval contract exists | `docs/AUTOMATION_PLATFORM_6B1_TRUST_POLICY_APPROVAL.md` |
| 6B-2 | event/worker/lease contract exists | `docs/AUTOMATION_PLATFORM_6B2_EVENT_WORKER_LEASE.md` |
| 6B-3 | supply-chain/CI contract exists | `docs/AUTOMATION_PLATFORM_6B3_SUPPLY_CHAIN_CI.md` |
| 6B-4 | recovery/rollback contract exists | `docs/AUTOMATION_PLATFORM_6B4_RECOVERY_ROLLBACK.md` |
| 6B-5 | observability/control-board contract exists | `docs/AUTOMATION_PLATFORM_6B5_OBSERVABILITY_CONTROL_BOARD.md` |
| 6B-6 | budget/retry/maturity-prep contract exists | `docs/AUTOMATION_PLATFORM_6B6_BUDGET_RETRY_MATURITY_PREP.md` |
| drift check | queue/doc consistency check covers core docs | `scripts/check-queue-docs.mjs` |
| release verification | release verify invokes queue/doc consistency | `scripts/verify-release.ps1` |

## 3. Completed foundation evidence

Completed design/governance foundation:

- Queue/router split is active.
- KOHEE product queue is paused while automation lane is active.
- Local Codex worker contract exists.
- Dry-run picker plan exists.
- GitHub evidence validator plan exists.
- Low/medium PR exercise loop plan exists.
- Approval and notification readiness exists.
- Automation platform / KOHEE product boundary exists.
- Automation status schema draft exists.
- Task intake schema draft exists.
- State transition policy exists.
- Project registry/catalog draft exists.
- Phase 6B lane split exists.
- Enterprise hardening gap map exists.
- 6B-1 through 6B-6 contracts exist.
- `check-queue-docs` verifies these documents.

## 4. Remaining HOLD list

These remain HOLD after the maturity gate unless separately approved:

- unattended execution loop.
- native auto-merge enablement.
- direct merge bot behavior.
- issue close automation.
- branch deletion automation.
- runtime worker/control-plane implementation.
- production deployment settings changes.
- Cloudflare credential or environment changes.
- GitHub branch protection/ruleset changes.
- D1/schema/migration/data changes.
- auth/session/security behavior changes.
- CSV import/reset behavior changes.
- public `/data` behavior changes.
- dependency/package/lockfile/install-script behavior changes without dependency review.
- external monitoring or alert integration using secrets.
- new `dev-automation-platform` repo creation or code move.

## 5. Product resume decision

Product work can resume only if all are true:

1. Owner/ChatGPT explicitly says KOHEE_PRODUCT may resume.
2. Active queue is updated or owner/ChatGPT explicitly defers the automation lane.
3. The next KOHEE product task is selected from `docs/queues/KOHEE_PRODUCT.md`.
4. The task is risk-classified using the current automation rules.
5. HIGH/HOLD product work still requires explicit approval.
6. GitHub evidence remains the source of truth for PR decisions.

Default outcome of this document:

```text
PRODUCT_RESUME_NOT_AUTOMATIC
```

## 6. Post-gate options

After this gate, choose one path:

| Option | Meaning | Default |
| --- | --- | --- |
| Continue automation lane | Implement selected automation contracts or policy-as-code checks next | recommended unless owner wants product work |
| Resume KOHEE product queue | Return to `docs/queues/KOHEE_PRODUCT.md` under platform rules | requires explicit owner/ChatGPT decision |
| Split automation into reusable repo | Start `dev-automation-platform` repo prep | HOLD until explicitly approved |
| Run exercise loop | Process real low/medium PRs through evidence loop | safe next validation path |
| Implement browser smoke | Add minimal browser smoke after dependency review | MEDIUM and requires scoped PR |

## 7. Go / No-Go criteria

GO for product resume only if:
- owner/ChatGPT explicitly approves product resume.
- no open automation PR is blocking.
- `check-queue-docs` passes.
- required validate checks pass.
- active product task is scoped and risk-classified.
- product task does not mix unrelated automation changes.

NO-GO / HOLD if:
- open PR has failed checks or unresolved review threads.
- active lane/source of truth is unclear.
- product task touches D1/schema, auth/session, CSV import/reset, public `/data`, deploy, credentials, package/lockfile/install-script, or production settings without explicit approval.
- automation lane still has an unresolved owner-requested blocker.
- evidence is based only on Codex self-report.

## 8. Maturity result

Current maturity result:

```text
AUTOMATION_DESIGN_MATURE_ENOUGH_FOR_CONTROLLED_NEXT_STEP
PRODUCT_RESUME_REQUIRES_EXPLICIT_OWNER_DECISION
STRONGER_AUTOMATION_BEHAVIOR_REMAINS_HOLD
```

Interpretation:
- The design/governance foundation is strong enough to proceed.
- The next safe step is either a controlled low/medium exercise loop or an explicitly approved product resume.
- Nothing in this gate enables automatic merge, unattended execution, deployment/config mutation, or product queue resume by itself.

## 9. Completion criteria

This gate is complete when:
- gate decision is documented.
- evidence checklist is documented.
- completed foundation evidence is documented.
- remaining HOLD list is documented.
- product resume decision rule is documented.
- post-gate options are documented.
- Go / No-Go criteria are documented.
- maturity result is documented.
- `check-queue-docs` verifies this gate document.
