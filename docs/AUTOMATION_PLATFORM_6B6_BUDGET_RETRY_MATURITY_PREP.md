# Phase 6B-6 Budget Retry Maturity Prep Contract

Date: 2026-05-13
Status: Phase 6B-6 design contract
Risk: LOW docs/governance

Purpose: define automation cost/quota guardrails, retry budget, concurrency caps, daily PR/lane caps, maturity gate checklist, reusable template extraction, docs simplification, and remaining HOLD list before Phase 6C.

Source relationship:
- Active queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Enterprise hardening map: `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`

No runtime behavior, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, dependency/package/lockfile/install-script, monitoring integration, auto-merge, unattended loop, or public `/data` behavior is changed by this document.

## 1. Cost and quota guardrail

The platform must prevent runaway automation cost and quota use before stronger automation is considered.

Cost/quota sources:

| Source | Risk | Initial guardrail |
| --- | --- | --- |
| GitHub Actions minutes | repeated validation, failed loops | serial execution by default |
| GitHub API rate limit | repeated polling or retries | bounded read retries |
| Cloudflare requests/builds | smoke/deploy checks | read-only smoke unless approved |
| Codex/LLM usage | repeated task attempts | stop after scoped PR/report |
| External monitoring | alert noise or paid usage | design-only until approved |

Rules:
- Do not start unattended loops without explicit owner/ChatGPT approval.
- Do not run repeated retries without a retry budget.
- Do not add paid/external monitoring integrations without approval.
- If cost/quota risk is unclear, return HOLD.

## 2. Retry budget

Retries should reduce transient failure, not hide broken automation.

Retry budget draft:

| Operation | Default retry budget | Notes |
| --- | --- | --- |
| read GitHub PR metadata | 3 | backoff allowed |
| read GitHub check/jobs | 3 | backoff allowed |
| read review threads | 3 | backoff allowed |
| read repository files | 2 | refetch before deciding |
| update repository file | 1 | re-fetch blob SHA first |
| create branch | 1 | verify branch does not already exist |
| create PR | 1 | search for existing PR first |
| merge PR | 0 automatic | always re-run evidence validation |
| external smoke | 1 | only if read-only and approved by lane rules |
| deploy/config write | 0 automatic | explicit approval required |

Rules:
- Exhausted retry budget becomes HOLD or FIX_REQUIRED.
- Merge retry requires new PR info, head SHA, check state, and review-thread state.
- Failed write operations must not be retried blindly.
- Rate-limit or platform outage should produce HOLD/fallback, not infinite retry.

## 3. Concurrency cap

Default concurrency is serial.

Concurrency classes:

| Class | Default cap | Notes |
| --- | --- | --- |
| active queue docs/checker edits | 1 | checker changes must be serialized |
| independent docs-only lanes | 2 max | only after dry-run confirms no overlap |
| workflow/config/deploy/security lanes | 1 | no parallel by default |
| runtime/product lanes | 1 | product queue paused until maturity gate |
| HIGH/HOLD lanes | 0 | require explicit approval first |

Parallel eligibility:
- No shared file paths.
- No shared checker/script edits unless serialized.
- No shared workflow/risk area.
- No active failed PR or unresolved thread in the same lane.
- No dependency/package/lockfile/install-script change.
- No D1/schema/auth/CSV/public-data/deploy/credential change.

## 4. Daily PR and lane cap

Caps prevent low-quality bulk changes.

Draft caps:

| Work type | Suggested cap | Notes |
| --- | --- | --- |
| docs-only automation lane | 3-5 PRs/day | only if checks pass and no unresolved blockers |
| checker/script changes | 2 PRs/day | avoid compounding false failures |
| MEDIUM design/audit PR | 1-2 PRs/day | requires careful evidence review |
| HIGH/HOLD work | 0 by default | approval required |
| production-affecting work | 0 by default | approval/release checklist required |

Rules:
- Caps are guidance until policy-as-code promotion.
- If repeated failures occur, stop lane and review process quality.
- Faster throughput must not bypass evidence validation.

## 5. Phase 6C maturity gate checklist

Phase 6C cannot pass on claims alone.

Gate checklist:

| Area | Required evidence |
| --- | --- |
| Phase 5 bridge | local runbook, dry-run picker, evidence validator, approval readiness complete |
| Phase 6A separation | platform/product boundary, task schema, state policy, registry/catalog drafts complete |
| Phase 6B lane split | lanes and completion expectations documented |
| trust/policy/approval | 6B-1 contract complete |
| event/worker/lease | 6B-2 contract complete |
| supply-chain/CI | 6B-3 contract complete |
| recovery/rollback | 6B-4 contract complete |
| observability/control-board | 6B-5 contract complete |
| budget/retry/maturity prep | 6B-6 contract complete |
| enterprise gap map | all 20 enterprise gaps mapped or explicitly deferred |
| HOLD list | remaining HOLD items explicit |
| product resume decision | owner/ChatGPT decision required |

Hard rule:
- Product work does not resume unless the maturity gate passes or owner/ChatGPT explicitly defers the automation lane.

## 6. Reusable template extraction plan

Templates should be extracted after Phase 6B contracts stabilize.

Candidate templates:

| Template | Purpose |
| --- | --- |
| task intake template | normalize owner requests into executable tasks |
| evidence report template | standard PR/decision evidence |
| MERGE/FIX/HOLD/NEXT template | standard decision output |
| approval pack template | scoped owner approval requests |
| release checklist template | production-affecting release review |
| rollback note template | rollback readiness and decision record |
| incident report template | incident state and postmortem seed |
| project registry template | onboard reusable managed projects |
| smoke checklist template | read-only browser/API smoke planning |
| dependency review template | package/action risk scoring |

Extraction rules:
- Do not duplicate KOHEE-specific policy into generic templates.
- Keep templates short and fillable.
- Templates should reference project registry profiles for project-specific risk areas.
- Template extraction may be a separate Phase 6C or post-Phase 6 PR.

## 7. Automation docs simplification plan

Docs should remain readable after hardening.

Target structure:

| Doc | Role |
| --- | --- |
| `AGENTS.md` | shortest possible entrypoint and hard rules |
| `docs/QUEUE_ROUTER.md` | active lane/router only |
| `docs/queues/AUTOMATION_PLATFORM.md` | active execution queue only |
| `docs/LOCAL_CODEX_RUNBOOK.md` | local execution rules |
| `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md` | phase grouping and detailed order |
| `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md` | enterprise gap map |
| `docs/AUTOMATION_PLATFORM_6B*.md` | focused hardening lane contracts |
| `docs/AUTOMATION_PLATFORM_EXTRA_HARDENING.md` | future backlog only |

Simplification rules:
- Do not collapse focused lane contracts back into one huge queue doc.
- Do not make `AGENTS.md` a full handbook.
- Remove stale legacy references only with narrow PRs.
- Prefer links over duplicated long sections.
- Keep `check-queue-docs` high-signal; avoid noisy strictness.

## 8. Remaining HOLD list

These remain HOLD until explicit owner/ChatGPT approval:

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

## 9. Phase 6B closure package

Before Phase 6C, produce or verify a closure package containing:

```text
completed_lanes:
remaining_hold_items:
known_gaps:
policy_as_code_candidates:
release_rollback_readiness:
supply_chain_readiness:
observability_readiness:
budget_retry_guardrails:
product_resume_recommendation:
```

Rules:
- The closure package may be a Phase 6C maturity-gate PR.
- It must rely on GitHub evidence, not Codex self-report.
- It must say clearly whether KOHEE_PRODUCT can resume or remains paused.

## 10. Completion criteria

This lane is complete when:
- cost/quota guardrail is documented.
- retry budget is documented.
- concurrency cap is documented.
- daily PR/lane cap is documented.
- Phase 6C maturity gate checklist is documented.
- reusable template extraction plan is documented.
- automation docs simplification plan is documented.
- remaining HOLD list is documented.
- Phase 6B closure package requirements are documented.
- no runtime, auto-merge, unattended loop, deployment, credential, D1/schema, auth/session, CSV, dependency, or public `/data` behavior is changed by this lane.
