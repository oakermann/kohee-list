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
