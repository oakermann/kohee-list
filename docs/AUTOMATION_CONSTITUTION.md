# Automation Constitution

Status: supreme automation contract
Risk: LOW docs/governance

Purpose: lock the automation platform's original operating model so future prompts, docs, queues, or implementation work cannot silently drift into a different architecture.

This document outranks all other automation docs. If another automation document conflicts with this constitution, this constitution wins.

## 1. Supreme operating model

The project-factory automation model is fixed as:

```text
User -> ChatGPT -> Cloudflare Worker/GitHub App -> GitHub task/evidence -> Local Codex -> PR -> GitHub Actions -> Codex Review/review threads -> automation decision -> merge or hold
```

This platform is not a KOHEE-only helper. KOHEE LIST is the first managed project, not the automation platform itself.

## 2. User contract

The user should be able to operate the platform with short commands such as:

```text
진행
확인
머지
```

The user must not become the manual prompt carrier for every Local Codex task.

The platform must reduce user relay work, not move relay work onto the user.

## 3. Role contract

| Role | Constitutional responsibility |
| --- | --- |
| User | Gives direction and approves HIGH/HOLD work when needed. |
| ChatGPT | Main orchestrator. Interprets user direction, chooses/normalizes the next task, creates or requests a task packet, and verifies GitHub evidence. |
| Cloudflare Worker/GitHub App | Online execution arm. Records task packets/evidence in GitHub, manages issue/PR comments/status, and later performs allowed LOW/MEDIUM merge actions after gates pass. |
| GitHub | Task queue and evidence store. Stores task packets, issue state, PR metadata, head SHA, changed files, checks, review threads, comments, and merge history. |
| Local Codex | Actual code worker. Reads task packets, edits locally, runs checks, commits, pushes, opens or updates PRs, and reports evidence. |
| Codex Review | PR reviewer/error detector. Creates review threads that must be resolved or explicitly waived before merge. |
| GitHub Actions | Validation gate for PR and release checks. |

## 4. Non-negotiable separation

ChatGPT must not replace Local Codex as the code worker during a routed Local Codex task.

Local Codex must not replace ChatGPT as the orchestrator.

Cloudflare Worker/GitHub App must not replace Local Codex as the local code/test executor.

GitHub Actions must not replace GitHub evidence review.

The user must not be forced to manually rewrite full task prompts for every task.

## 5. Automation stages

The platform stages are fixed:

| Stage | Name | Status | Meaning |
| --- | --- | --- | --- |
| 1 | Evidence foundation | Preserve | GitHub evidence is the source of truth. |
| 2 | Local Codex worker discipline | Preserve | Local Codex performs scoped edits/tests/PRs. |
| 3 | Risk and decision gates | Preserve | Policy-risk and MERGE/FIX/HOLD/NEXT gate unsafe work. |
| 4 | Click-run task rail | Active | ChatGPT -> Cloudflare/GitHub App -> task packet -> Local Codex -> PR. |
| 5 | Project profiles | Next after 4 | KOHEE, news app, handover app, blog/status site share the platform through project profiles. |
| 6 | Control plane hardening | Later | Cloudflare/GitHub App dashboard, broker, notifications, multi-project control, and stronger operations. |

Enterprise hardening documents are reference/backlog unless explicitly promoted by the active queue.

## 6. Merge policy

LOW/MEDIUM work can auto-merge only after every evidence gate passes:

- project profile allows LOW/MEDIUM auto-merge.
- changed files match the task packet.
- forbidden areas are absent.
- PR Validate succeeds.
- Validate succeeds.
- unresolved review threads are absent.
- Codex Review threads are resolved or explicitly waived.
- head SHA is stable.
- policy-risk result is LOW or approved MEDIUM.
- PR evidence is complete.

HIGH/HOLD never auto-merges. HIGH/HOLD requires explicit user approval.

Local Codex does not merge directly. The automation layer may later merge allowed LOW/MEDIUM work after gates pass.

## 7. Task packet contract

`TASK_PACKET` is the standard work order between ChatGPT, Cloudflare/GitHub App, GitHub, and Local Codex.

Required fields:

```text
task_id:
project:
lane:
risk:
mode:
goal:
allowed_files:
forbidden_areas:
checks:
stop_condition:
report_format:
merge_policy:
```

Default task storage starts in GitHub issue `#23` or a dedicated GitHub task issue until a richer queue API exists.

## 8. Active work rule

Open PRs, failed checks, unresolved review threads, and issue blockers come before new work.

Do not start unrelated new work while an active PR needs FIX/HOLD handling.

Each routed task should produce one scoped PR and stop.

## 9. Restricted work rule

The following remain HIGH/HOLD unless explicitly scoped and approved:

- D1/schema/migration/data mutation.
- auth/session/security behavior changes.
- CSV import/reset behavior changes.
- public data behavior changes.
- deploy or production settings.
- secrets/credentials.
- package/lockfile/install-script behavior without review.
- broad product work while automation lane is active.
- HIGH/HOLD auto-merge.

## 10. Project-factory rule

The automation platform must be designed to manage multiple projects:

- KOHEE LIST.
- news app.
- handover/internal work app.
- blog/status site.
- future projects.

Each project must eventually have a project profile that declares repo, local path, risk rules, forbidden areas, test commands, deploy rules, active queue, and product-specific invariants.

## 11. Drift rule

Future changes must not convert the platform into:

- a document-only governance system.
- a KOHEE-only workflow.
- a user-to-Codex prompt-copy workflow.
- a Cloudflare-only code executor.
- an unguarded auto-merge system.
- a HIGH/HOLD auto-merge system.

If a proposed change conflicts with this constitution, it must be HOLD until the user explicitly approves a constitutional amendment.

## 12. Amendment rule

This document can only be changed by an explicit user request that mentions changing the automation constitution or top-level operating model.

Incidental docs cleanup must not weaken this document.
