# KOHEE Design Review Log

Purpose: record design and review decisions from the ChatGPT design/review chat.

Use this for:

- architecture decisions
- automation policy decisions
- risk classification decisions
- rejected alternatives
- evidence behind a design judgment

Do not use this for:

- step-by-step execution logs
- raw chat transcripts
- local command output dumps
- secrets, tokens, cookies, or database dumps

Keep entries concise and action-oriented.

Entry format:

```text
## YYYY-MM-DD — Title

Status:
Decision:
Evidence:
Impact:
Next action:
```

---

## 2026-05-11 — Required check source cleanup

Status: decided
Decision: Required checks should use native GitHub Actions check-runs. Avoid custom commit status context named `pr-validate`.
Evidence: A custom `pr-validate` status can diverge between head SHA and test merge commit SHA and confuse branch protection.
Impact: PR #95 must remove custom `createCommitStatus` publishing before merge or replacement.
Next action: Keep required checks as `pr-validate` and `verify` from GitHub Actions; remove duplicate custom status code from validator work.

## 2026-05-11 — Log separation

Status: decided
Decision: Separate design decisions, work execution records, and local Codex audit records into different files.
Evidence: ACTIVE_QUEUE became too verbose when design analysis and execution details were mixed.
Impact: ACTIVE_QUEUE remains short; detailed evidence moves to audit logs.
Next action: Use this file for design judgment, `WORK_SESSION_LOG.md` for GitHub execution, and `LOCAL_CODEX_AUDIT_LOG.md` for local Codex runs.

## 2026-05-11 - Required checks expected triage

Status: decided
Decision: Treat PR #109 as a ruleset/check association problem, not an app runtime problem.
Evidence: PR #109 head SHA has GitHub Actions check-runs `pr-validate` and `verify` from app id `15368`, both successful, but REST merge reports `2 of 2 required status checks are expected`.
Impact: Prefer fresh PR-head checks and native auto-merge before changing repository rulesets.
Next action: If fresh checks still do not satisfy the ruleset, inspect and minimally adjust required-check settings.

## 2026-05-11 - Execution track routing

Status: decided
Decision: Use `MOBILE_TRACK` and `LOCAL_TRACK` as lightweight routing hints, not blocking rules.
Evidence: The user works in two modes: outside/mobile via ChatGPT + GitHub connector, and home/PC via ChatGPT prompts + local Codex with `gh`, `wrangler`, Cloudflare, tests, and secret-dependent checks.
Impact: Work should route faster without forcing rigid labels. MOBILE_TRACK handles planning, review, PR triage, docs, and safe GitHub edits. LOCAL_TRACK handles local tools, webhook delivery, Cloudflare, secrets/private-key handling, full test/debug loops, and deeper code fixes.
Next action: Record track hints in AGENTS, MASTER_CONTEXT, and ACTIVE_QUEUE; move mobile work to LOCAL_TRACK when local tools or secrets become necessary.
