# KOHEE LIST Master Context

Last updated: 2026-05-19

KOHEE LIST is a cafe curation product repository. OAP is maintained separately.
This file is the short source-of-truth index for agents and external systems.

## Repo Identity

- Product: KOHEE LIST
- Repository: `oakermann/kohee-list`
- Type: product repo
- OAP: external
- Runtime: Cloudflare Pages + Workers + D1

## Required Read Order

1. `kohee.contract.json`
2. `docs/KOHEE_MASTER_CONTEXT.md`
3. `docs/KOHEE_CONSTITUTION.md`
4. Task-specific policy docs below
5. The files directly needed for the task

Do not rely on chat memory, old queue docs, or stale task comments as source of
truth.

## Precedence

If docs conflict, follow this order:

1. `docs/KOHEE_CONSTITUTION.md`
2. `kohee.contract.json`
3. `docs/KOHEE_MASTER_CONTEXT.md`
4. Task-specific policy docs
5. Historical notes and audits

Conflicting instructions that would weaken product invariants are `HOLD`.

## Detailed Docs

- `docs/KOHEE_CONSTITUTION.md`: immutable product rules.
- `docs/KOHEE_PRODUCT_RULES.md`: cafe lifecycle, review, badges, UI copy, and category policy.
- `docs/KOHEE_DATA_POLICY.md`: public/private data, submissions, CSV, review exports, and verification policy.
- `docs/KOHEE_D1_DEPLOY_RUNBOOK.md`: D1 migration, deploy, smoke, rollback, and HOLD runbook.
- `docs/KOHEE_ROADMAP.md`: executable task cards.
- `docs/KOHEE_EXECUTION_LOG.md`: concise history for new agents.

## Always Preserve

- Public `/data` exposes only `status='approved' AND deleted_at IS NULL`.
- Candidate/public separation is mandatory.
- CSV `status=approved` must not directly publish cafes.
- Submissions accepted by review do not equal public approval.
- Internal fields must not leak publicly.
- D1 remote migration requires explicit approval and backup.
- OAP platform implementation must not live in this repo.
