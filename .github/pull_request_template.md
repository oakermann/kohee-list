Risk:

Lane:

KOHEE_STATUS:

PR evidence rule:

- PR_OPEN is valid only when `active_pr` and `evidence.pr_url` contain a real GitHub PR URL.
- A commit hash, branch name, patch note, or make_pr metadata without a real GitHub PR URL is `UNVERIFIED`.
- If PR publishing fails, set `state: HOLD`, `blocker: HOLD_CODEX_PR_PUBLISHING`, `verification.status: UNVERIFIED`, and `user_action_required: true`.

```yaml
KOHEE_STATUS:
  command_id:
  state: WORKING | PR_OPEN | HOLD
  risk:
  lane:
  active_pr:
  head_sha:
  owner: codex
  retry:
    failure_signature:
    count_for_signature:
    last_failed_run:
    last_attempt_at:
  blocker:
  next_action:
  user_action_required:
  deploy_check_required:
  deploy_status:
  verification:
    status: VERIFIED | UNVERIFIED | CONFLICTED
    last_verified_at:
    changed_files_checked:
    diff_checked:
    checks_checked:
    codex_review_checked:
    unresolved_threads_checked:
    pages_deploy_sync_checked:
    asset_cache_bust_checked:
    high_risk_paths_checked:
    deploy_checked:
  evidence:
    checks_url:
    pr_url:
    deploy_url:
    review_url:
    notes:
```

Auto-merge eligible:

HIGH-risk paths touched:

Changed files:

Tests:

Deploy check:

Remaining risks:

Reviewer checklist:

- [ ] Lane/Risk/scope are correct.
- [ ] Allowlist respected.
- [ ] No runtime app behavior changed unintentionally.
- [ ] No deploy workflow behavior changed unintentionally.
- [ ] No D1 migration auto-apply.
- [ ] Public/API/auth/CSV safety reviewed.
- [ ] No unresolved P1/P2 or review threads before merge.
