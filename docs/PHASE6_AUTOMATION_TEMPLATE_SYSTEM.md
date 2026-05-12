# Phase 6 Automation Template System

Status: future-stage design / no cross-project automation yet
Date: 2026-05-12
Owner: ChatGPT design, Local Codex implementation
Lane: GOVERNANCE / AUTOMATION_PLATFORM
Risk: MEDIUM/HIGH depending on scope reuse

## Goal

Phase 6 extracts the KOHEE automation stack into a reusable automation platform for future projects.

Target future projects:

- news app
- KOHEE operations/dev diary
- internal office/handover app
- future Cloudflare/GitHub AI-assisted products

The goal is not to clone KOHEE behavior blindly. The goal is to reuse the automation operating model safely.

## What becomes reusable

Reusable automation components:

- `AGENTS.md` structure
- ACTIVE_QUEUE structure
- LOCAL_CODEX_RUNBOOK structure
- risk/lane/HOLD vocabulary
- command dispatch create-only/no-overwrite
- command validator
- read-only maintenance audit pattern
- GitHub App dry-run bridge pattern
- Phase 3 safe issue-comment bridge pattern
- Phase 4 native auto-merge eligibility classifier
- PR body KOHEE_STATUS pattern
- GitHub Actions validation workflow pattern
- audit:<project> pattern
- MERGE/FIX/HOLD/NEXT review loop
- local Codex worker model
- low-cost GitHub + Cloudflare + local-worker architecture

## What must remain project-specific

Must not be blindly reused:

- KOHEE public `/data` rules
- KOHEE CSV lifecycle semantics
- KOHEE admin/user role policy
- KOHEE category/tag rules
- KOHEE D1 schema
- news app ingestion logic
- internal office app permission/data model
- project-specific deploy workflows and secrets

## Cost target

Phase 6 must preserve the low-cost operating model:

- GitHub public-repo standard Actions where possible
- Cloudflare Free-first operation
- local Codex execution instead of paid cloud workers
- avoid paid orchestrators by default
- avoid heavy observability stacks unless justified

## Architecture

Phase 6 becomes a layered system:

### Layer 1: reusable automation core

Reusable:

- command validation
- task/queue conventions
- PR evidence format
- dry-run worker bridge
- native auto-merge eligibility classifier
- local worker runbook

### Layer 2: project contract

Each project defines:

- forbidden paths
- HIGH/HOLD rules
- required checks
- allowed PR classes
- public data invariants
- deploy rules
- project-specific audit rules

Example:

- `kohee.contract.json`
- future `news.contract.json`
- future `handover.contract.json`

### Layer 3: project implementation

Actual runtime/product code.

## Template candidate structure

Potential reusable layout:

- `automation-core/`
- `automation/github-app-worker/`
- `scripts/validate-command.mjs`
- `scripts/audit-project.mjs`
- `.github/workflows/pr-validate.yml`
- `.github/workflows/validate.yml`
- `docs/ACTIVE_QUEUE_TEMPLATE.md`
- `docs/LOCAL_WORKER_TEMPLATE.md`

## News app adaptation

The future news app should reuse:

- queue/risk/lane model
- GitHub Actions validation
- local Codex worker
- safe issue-comment bridge
- LOW-risk auto-merge eligibility

But must define separately:

- ingestion pipeline rules
- AI budget controls
- event clustering rules
- feed generation rules
- article retention/cache policy

## Internal office app adaptation

The internal office app should reuse:

- local Codex worker
- validation/audit structure
- risk gating
- branch/check workflow

But must define separately:

- LAN/offline rules
- SQLite/local DB rules
- document export requirements
- internal permission rules

## Risks

Main risk:

Turning the reusable automation core into an uncontrolled generic agent platform.

Avoid:

- unrestricted remote execution
- auto-deploy without gates
- bypassing GitHub checks/rulesets
- broad write permissions
- mixing HIGH and LOW lanes
- cross-project secret reuse

## Phase 6 implementation order

### Phase 6A: audit reusable pieces

Risk: LOW

Scope:

- identify reusable automation modules
- classify project-specific vs reusable
- no behavior change

### Phase 6B: extract documentation templates

Risk: LOW

Scope:

- reusable AGENTS/ACTIVE_QUEUE/RUNBOOK templates
- reusable command schema docs
- reusable PR status patterns

### Phase 6C: extract reusable tooling

Risk: MEDIUM

Scope:

- shared command validator core
- shared risk/lane classifier
- shared auto-merge eligibility classifier
- no production runtime changes

### Phase 6D: multi-project automation readiness

Risk: HIGH

Scope:

- separate project contracts
- shared automation core
- multi-project worker routing
- explicit repo allowlists
- no uncontrolled cross-project execution

## Success criteria

Phase 6 is successful when:

- a new project can bootstrap with the automation template quickly
- LOW-risk automation behavior is consistent across projects
- HIGH/HOLD paths remain project-specific and gated
- GitHub remains source of truth
- local Codex remains the execution layer
- cost remains near-free for small/medium personal projects

## Local Codex starting prompt for Phase 6A

```text
작업 시작해. docs/PHASE6_AUTOMATION_TEMPLATE_SYSTEM.md 기준으로 Phase 6A reusable automation audit만 진행해. KOHEE 자동화 구조 중 reusable vs project-specific 요소를 정리하고 문서화해. 공용 automation-core 후보만 분류하고 실제 runtime extraction은 하지 마라. D1/schema/auth/CSV/public data/deploy/secrets/branch delete/issue close/direct merge bot은 건드리지 마라. 완료 후 PR을 열고 LOCAL_CODEX_AUDIT_LOG.md와 issue #23에 Status / Changed files / Tests / Remaining risks / Next action / Evidence 형식으로 보고해.
```
