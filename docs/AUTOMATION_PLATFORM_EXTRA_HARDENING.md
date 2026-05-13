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

## Placement in the automation lane

These items should be handled before the platform maturity gate and before project feature work resumes. They can be grouped into a small number of docs PRs if doing each one separately makes the queue too noisy.

Suggested grouping:

1. Input trust, webhook idempotency, task lease.
2. Reusable workflow, approval gates, short-lived credential readiness, scanning baseline, SBOM.
3. Golden path, catalog health, event journal.

## Hold conditions

- Do not change repository settings, workflow settings, deployment configuration, or credential storage from these planning tasks.
- Do not enable direct write actions, auto-merge, branch deletion, issue close, or project onboarding automation from these planning tasks.
- Keep the first control board implementation read-only.
