# Automation Platform Enterprise Hardening Map

Date: 2026-05-13
Status: Phase 6B backlog map
Risk: LOW docs/governance

Purpose: capture enterprise-grade operating gaps that should be absorbed into the automation-platform hardening lane without bloating the active queue.

Source of truth relationship:
- Active lane/router: `docs/QUEUE_ROUTER.md`
- Active execution queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- This document maps enterprise operating gaps into Phase 6B lanes.

No runtime behavior, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, or public `/data` behavior is changed by this document.

## Enterprise gap inventory

| # | Gap | Why it matters | Phase 6B lane |
| --- | --- | --- | --- |
| 1 | DORA / delivery metrics | Measure delivery speed, change risk, and recovery instead of relying on intuition. | `6B-5 observability-control-board` |
| 2 | Automation SLO / stuck detection | Detect when the automation platform itself is slow, stuck, or failing. | `6B-2 event-worker-lease`, `6B-5 observability-control-board` |
| 3 | Policy-as-code enforcement | Move key rules from human-readable docs into automated gates where safe. | `6B-1 trust-policy-approval` |
| 4 | Release artifact provenance | Connect source PR, head SHA, workflow run, build output, and deployed version. | `6B-3 supply-chain-ci`, `6B-4 recovery-rollback` |
| 5 | Cloudflare rollback / deployment runbook | Define what can be rolled back, what cannot, and which evidence is required. | `6B-4 recovery-rollback` |
| 6 | Browser smoke / E2E | Catch real browser regressions that unit and docs checks cannot catch. | `6B-5 observability-control-board` |
| 7 | Secrets / OIDC / least privilege | Reduce blast radius for deployment and automation credentials. | `6B-3 supply-chain-ci` |
| 8 | Dependency / third-party risk scoring | Decide whether new dependencies or actions are acceptable before adoption. | `6B-3 supply-chain-ci` |
| 9 | Threat modeling / prompt injection defense | Treat issue, PR, and model-generated text as untrusted input. | `6B-1 trust-policy-approval` |
| 10 | Immutable audit / evidence archive | Preserve why decisions were made and who approved exceptions. | `6B-4 recovery-rollback` |
| 11 | Incident response / postmortem | Standardize incident severity, freeze, rollback, and follow-up action handling. | `6B-4 recovery-rollback`, `6B-5 observability-control-board` |
| 12 | Config / infra drift detection | Detect divergence between repo docs/code and GitHub/Cloudflare settings. | `6B-3 supply-chain-ci`, `6B-5 observability-control-board` |
| 13 | Cost / quota guardrail | Prevent runaway automation loops and unexpected platform cost. | `6B-6 budget-retry-maturity-prep` |
| 14 | Docs simplification | Keep entrypoint docs short while detailed rules move to focused references. | `6B-6 budget-retry-maturity-prep` |
| 15 | Reusable template extraction | Make the platform reusable for KOHEE, news app, blog/status site, and internal handover app. | `6B-6 budget-retry-maturity-prep` |
| 16 | Branch protection / ruleset inventory | Know which checks and bypass permissions actually protect `main`. | `6B-3 supply-chain-ci` |
| 17 | Data classification / privacy inventory | Separate public, internal, admin, private, and submission/contact data. | `6B-1 trust-policy-approval`, `6B-3 supply-chain-ci` |
| 18 | D1 backup / restore drill | Prove database recovery steps instead of only documenting them. | `6B-4 recovery-rollback` |
| 19 | Release notes / changelog automation | Preserve what changed, why it changed, and what users/operators should know. | `6B-4 recovery-rollback`, `6B-6 budget-retry-maturity-prep` |
| 20 | Customer impact / maintenance process | Connect technical changes to user/admin impact, maintenance mode, and notices. | `6B-5 observability-control-board`, `6B-6 budget-retry-maturity-prep` |

## Lane absorption plan

### 6B-1 trust-policy-approval

Output document:
- `docs/AUTOMATION_PLATFORM_6B1_TRUST_POLICY_APPROVAL.md`

Absorb:
- Policy-as-code enforcement direction.
- Approval ledger.
- Owner override protocol.
- Threat modeling / prompt injection defense.
- RACI-style role split for owner, release approver, incident lead, reviewer, security approver, and rollback approver.
- Data classification policy direction.

Output:
- A policy and approval contract that defines what can be automated, what requires owner approval, and what must remain HOLD.

### 6B-2 event-worker-lease

Output document:
- `docs/AUTOMATION_PLATFORM_6B2_EVENT_WORKER_LEASE.md`

Absorb:
- Automation SLO signals related to stuck work.
- Task lease and heartbeat design.
- Webhook idempotency and redelivery design.
- Duplicate event handling.
- Retry/rate-limit behavior.
- Fallback path when the automation worker is unavailable.

Output:
- Worker/event reliability contract before any stronger loop behavior is considered.

### 6B-3 supply-chain-ci

Output document:
- `docs/AUTOMATION_PLATFORM_6B3_SUPPLY_CHAIN_CI.md`

Absorb:
- Secrets inventory and permission minimization.
- OIDC feasibility.
- Workflow permission review.
- Branch protection / ruleset inventory.
- Third-party action pinning and risk scoring.
- Dependency risk scoring.
- Package, lockfile, and install-script gates.
- Build provenance and artifact attestation readiness.
- Config / infra drift audit.

Output:
- Supply-chain and CI/CD posture contract with HIGH/HOLD boundaries.

### 6B-4 recovery-rollback

Absorb:
- Rollback runbook.
- Release checklist.
- Last-known-good SHA policy.
- Cloudflare rollback/deployment runbook.
- D1 backup / restore drill policy.
- Immutable audit / evidence archive.
- Failed PR history and blocked-lane history.
- Incident response / postmortem template.
- Release notes / changelog requirements.

Output:
- Recovery and release auditability contract usable by the Phase 6C maturity gate.

### 6B-5 observability-control-board

Absorb:
- DORA / delivery metrics.
- Automation SLO dashboard signals.
- Health alert design.
- Error monitoring design.
- Browser smoke / E2E visibility.
- Incident visibility.
- Customer impact and maintenance process signals.
- Control-board data-source mapping.

Output:
- Observability and control-board contract before runtime dashboard work begins.

### 6B-6 budget-retry-maturity-prep

Absorb:
- Cost / quota guardrail.
- Retry budget.
- Concurrency cap.
- Daily PR or lane cap.
- Maturity gate checklist.
- Reusable template extraction plan.
- Automation docs simplification plan.
- Remaining HOLD list.

Output:
- Final Phase 6B closure package and Phase 6C maturity-gate prep.

## Enterprise hardening execution rules

- Do not implement runtime behavior while mapping these gaps.
- Do not change production settings, credentials, deployments, D1/schema, auth/session, CSV import/reset, or public `/data` behavior without explicit owner approval.
- Prefer docs/schema/design first, then audit, then config/code only when explicitly promoted.
- Split work by lane and avoid same-file overlap.
- Keep `scripts/check-queue-docs.mjs` changes serialized.
- Record stronger actions as approval packs, not as enabled behavior.

## Minimum Phase 6B completion expectation

Phase 6B is not mature unless the following are at least documented or explicitly scheduled with blockers:

- Release checklist.
- Rollback runbook.
- Last-known-good SHA policy.
- Secrets and permissions audit.
- Branch protection / ruleset inventory.
- Browser smoke / E2E plan.
- Health alert / error monitoring plan.
- Policy-as-code direction.
- Threat modeling / prompt injection defense.
- Evidence archive / decision log policy.
- Incident/postmortem process.
- Cost/quota guardrail.
- Reusable template extraction plan.
- Docs simplification plan.
