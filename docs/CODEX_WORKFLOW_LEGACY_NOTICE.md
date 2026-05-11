# CODEX_WORKFLOW Legacy Notice

Last updated: 2026-05-11
Status: notice / routing helper

`docs/CODEX_WORKFLOW.md` is a legacy/local Codex workflow reference.

Use these files first for current KOHEE work:

```text
docs/KOHEE_MASTER_CONTEXT.md = long-term policy and invariants
docs/KOHEE_ACTIVE_QUEUE.md = current blockers and next actions
docs/audits/DESIGN_REVIEW_LOG.md = design decisions
docs/audits/WORK_SESSION_LOG.md = GitHub execution evidence
docs/audits/LOCAL_CODEX_AUDIT_LOG.md = local Codex evidence
```

If `CODEX_WORKFLOW.md` conflicts with `KOHEE_MASTER_CONTEXT.md` or `KOHEE_ACTIVE_QUEUE.md`, follow the newer master/queue files.

Cloud/mobile work should not attempt a large rewrite of `CODEX_WORKFLOW.md` through connector-only editing. Use a small local patch later if a top-of-file notice is still needed.

Current blocked local work:

- PR #118: finish legacy manager/pick removal after `scripts/test-unit.mjs` rewrite.
- Phase 2: confirm GitHub App webhook delivery 200 and Worker dry-run logs.
