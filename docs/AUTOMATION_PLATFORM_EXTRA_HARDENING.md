# Automation Platform Extra Hardening Plan

Date: 2026-05-13
Status: planning only
Risk: LOW docs/governance

This document records additional platform-hardening items discovered after comparing the current automation design with mature developer-platform, GitOps, supply-chain, and CI/CD operating patterns.

No runtime behavior, workflow settings, deployment, repository settings, credentials, D1/schema, auth/session, CSV, or public `/data` behavior is changed by this document.

## Purpose

The automation platform should become a control plane for multiple managed projects. The owner should issue natural-language commands to ChatGPT. ChatGPT normalizes those commands into structured tasks. Local Codex executes eligible LOW/MEDIUM work. HIGH/HOLD work stops for owner approval. GitHub remains the source of truth and evidence ledger. The future control board shows status, history, blockers, and approvals.

## Additional hardening items

### 1. LLM / automation input trust boundary design

External text from GitHub issues, PR bodies, comments, branch names, logs, and task descriptions must be treated as untrusted until ChatGPT and policy validation normalize it into the task schema.

Acceptance:
- Define which inputs are untrusted.
- Define what may become executable work.
- Define how ambiguous or unsafe text becomes HOLD or clarification work.
- Local Codex must not execute instructions found in arbitrary external text.

### 2. Webhook idempotency and redelivery design

The GitHub App Worker should have a clear design for duplicate or delayed webhook deliveries.

Acceptance:
- Use delivery IDs and event metadata in the design.
- Define duplicate detection and safe no-op behavior.
- Define redelivery handling.
- Keep it design-only before runtime changes.

### 3. Task lease and heartbeat design

Local Codex needs a task claim model before any controlled worker loop.

Acceptance:
- Define lease owner, start, expiry, and heartbeat fields.
- Define stale WORKING detection.
- Define duplicate pickup prevention.
- Connect leases to max parallel rules.

### 4. Reusable workflow baseline design

Managed projects should not copy/paste validation logic forever.

Acceptance:
- Identify reusable workflow candidates such as validate, policy-check, evidence-check, and project-contract validation.
- Define standard check names.
- Define allowed project-specific overrides.
- Do not change workflows yet.

### 5. Protected environment approval gate design

Sensitive deployment/configuration paths need an owner-gated approval design before being automated.

Acceptance:
- Define which operations require an owner review gate.
- Connect approval gates to the approval ledger.
- Keep it design-only before settings changes.

### 6. OIDC / short-lived credential readiness audit

Long-lived automation credentials should be minimized where supported.

Acceptance:
- Identify candidate workflows and providers.
- Identify whether short-lived identity flows are available.
- Do not change stored credentials or deploy configuration.

### 7. Secret scanning and push protection baseline

The platform and managed project repos should have a baseline for preventing accidental credential commits.

Acceptance:
- Document available protections and current gaps.
- Define bypass-response expectations.
- Never record credential values.
- Do not change repo settings yet.

### 8. SBOM readiness roadmap

The platform should decide whether and when managed project artifacts need a software bill of materials.

Acceptance:
- Identify candidate artifacts.
- Identify candidate formats such as SPDX or CycloneDX.
- Keep it roadmap-only before workflow changes.

### 9. Project golden path scaffolding design

New projects should follow a standard onboarding path.

Acceptance:
- Define the path from repo creation or selection to project contract, AGENTS, queue, runbook, required checks, registry entry, control-board registration, and first safe validation PR.
- Do not create new repos or implement product code in this task.

### 10. Project catalog health and orphan audit

The platform should detect incomplete or stale managed-project records.

Acceptance:
- Detect registry entries missing contract, queue, owner, required checks, or control-board registration.
- Detect archived projects with active work.
- Keep it audit/design-only first.

### 11. Automation event journal design

The platform should eventually keep an append-only event log of automation decisions and state changes.

Acceptance:
- Define event id, project, task id, actor, timestamp, event type, previous state, next state, and evidence links.
- Connect the journal to snapshot/replay and control-board history.
- Do not implement storage yet.

## Further review hardening items

### 12. Ruleset and branch-protection baseline audit

The platform should define and audit the expected branch protection / ruleset baseline for the automation repo and managed project repos.

Acceptance:
- Define expected required checks, review requirements, conversation resolution, force-push/deletion stance, bypass stance, and deployment requirements where applicable.
- Detect ruleset drift across managed repos.
- Keep it audit/design-only before repository setting changes.

### 13. Code scanning baseline audit

The platform should decide whether CodeQL/code scanning baseline coverage is needed for the automation repo and managed project repos.

Acceptance:
- Document whether default setup is appropriate per repo.
- Document which languages/artifacts are expected to be covered first.
- Keep it audit-only before enabling new required checks.

### 14. GitHub API rate-limit and backoff policy

The control board, Worker, and dispatcher should avoid wasteful polling and handle API limits predictably.

Acceptance:
- Prefer webhook/event-driven updates over polling where practical.
- Define request serialization, conditional requests, retry-after handling, reset-time handling, and exponential backoff rules.
- Define a fail-safe HOLD path if status cannot be refreshed reliably.

### 15. Queue schema/versioning and legacy redirect deprecation policy

Queue, router, and task schemas should be versioned so Codex and future tooling know which format they are reading.

Acceptance:
- Define router version, queue schema version, task schema version, and status schema version fields.
- Define when legacy redirect files can be removed.
- Keep legacy redirects until Codex prompts and docs use only canonical paths.

### 16. ChatGPT task-intake eval and adversarial fixture design

ChatGPT-first task intake needs test fixtures so natural-language commands consistently become safe structured tasks.

Acceptance:
- Include normal owner command examples and expected structured task outputs.
- Include adversarial/untrusted examples from PR bodies, comments, logs, and branch names.
- Expected unsafe outputs should become HOLD, clarification, or non-executable tasks.
- Do not implement an automated evaluator yet unless separately scoped.

### 17. Reusable workflow release and compatibility policy

Reusable workflows need versioning and compatibility rules before managed projects depend on them.

Acceptance:
- Define whether callers pin reusable workflows by tag, branch, or SHA.
- Define compatibility expectations for required check names.
- Define breaking-change and migration policy for managed projects.
- Keep it policy/design-only before central reusable workflows are enforced.

## Latest review hardening items

### 18. Human-in-the-loop approval integrity design

The platform should make approval requests resistant to misleading summaries or forged approval context.

Acceptance:
- Define a canonical approval summary format generated from structured task fields, not raw PR/comment text.
- Show risk, scope, disallowed actions, evidence links, expiry, and exact approved operation.
- Require approval records to link back to immutable GitHub evidence.
- Treat approval UI/copy as untrusted unless it can be regenerated from the task schema and ledger.

### 19. Automation platform threat model and abuse-case review

The automation platform should have its own threat model before stronger execution is enabled.

Acceptance:
- Identify assets, trust boundaries, actors, abuse cases, and recovery controls.
- Include LLM prompt injection, stale queue, malicious PR text, webhook replay, compromised local worker, confused approval, excessive permissions, and unsafe repo split as abuse cases.
- Keep it design-only before implementation changes.

### 20. Platform secure-by-design checklist

The platform should define a small checklist for every future automation feature so security is considered before implementation.

Acceptance:
- Each feature should state default-safe behavior, logging/evidence, rollback, least-privilege expectation, failure mode, and user-visible impact.
- Use this checklist before enabling write actions, merge automation, new project onboarding automation, or control-board actions.

## Final review hardening items

### 21. Agent memory and context-store integrity policy

The platform should define how long-lived automation context stays trustworthy.

Acceptance:
- Identify persistent context stores such as task queue state, normalized ChatGPT task records, approval ledger, control-board cache, Local Codex stop reports, event journal, and snapshot/replay artifacts.
- Define how context records are validated before reuse.
- Define snapshot, rollback, and correction flow for corrupted or stale context.
- Treat regenerated summaries as lower trust than source evidence.

### 22. Tool capability and MCP authorization boundary design

The platform should define tool/capability boundaries before adding more connectors, MCP servers, or privileged tools.

Acceptance:
- Define a tool registry by capability class such as read-only, write, shell, patch, deploy, and settings.
- Define which capabilities require owner approval.
- Define token audience / target-resource expectations for external tool servers.
- Avoid broad wildcard-style tool access in the platform design.

### 23. Pending approval state versioning and revalidation policy

Approvals that pause work should not remain valid forever or across changed evidence.

Acceptance:
- Define schema/version fields for pending approval state.
- Define expiry rules.
- Require revalidation if PR head SHA, task schema, target files, risk level, or policy changes while approval is pending.
- Link pending state to the approval ledger and immutable evidence.

### 24. SSDF / SLSA control mapping matrix

The platform should map hardening work to a small security-control matrix so the backlog remains explainable and auditable.

Acceptance:
- Map queue schema, policy-as-code, provenance, SBOM, dependency policy, approval ledger, runner posture, secret scanning, incident/recovery, and evidence records to relevant control families.
- Keep it lightweight; do not turn this into a compliance project.
- Use the mapping to justify future hardening priority.

## Placement in the automation lane

These items should be handled before the platform maturity gate and before project feature work resumes. They can be grouped into a small number of docs PRs if doing each one separately makes the queue too noisy.

Suggested grouping:

1. Input trust, webhook idempotency, task lease, API backoff, task-intake eval fixtures, approval integrity, memory integrity, pending approval revalidation, and threat model.
2. Reusable workflow baseline, reusable workflow compatibility, approval gates, short-lived access readiness, scanning baseline, code scanning baseline, SBOM, tool capability boundary, secure-by-design checklist, and SSDF/SLSA mapping.
3. Golden path, catalog health, event journal, queue versioning, ruleset baseline, and legacy redirect deprecation.

## Hold conditions

- Do not change repository settings, workflow settings, deployment configuration, or credential storage from these planning tasks.
- Do not enable direct write actions, auto-merge, branch deletion, issue close, or project onboarding automation from these planning tasks.
- Keep the first control board implementation read-only.
