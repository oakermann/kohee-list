---
name: KOHEE task
about: Scoped Codex Factory task request.
---

## Lane

## Risk

## Scope / allowlist (files + functions)

## KOHEE_COMMAND

```yaml
KOHEE_COMMAND:
  command_id:
  state: QUEUED
  risk: LOW | MEDIUM | HIGH
  lane: GOVERNANCE | DEPLOY_SAFETY | PUBLIC_EXPOSURE | AUTH_ROLE | LIFECYCLE | CSV_PIPELINE | FRONTEND_RENDERING
  source: ChatGPT
  owner: codex
  terminal_state: MERGED_AND_DEPLOYED | DONE_NO_DEPLOY | HOLD
  user_action_required: false
  task:
  acceptance_criteria:
  allowed_files:
  denied_files:
  runtime_change_allowed: false
  do_not_change:
  high_risk_hold:
  created_at:
  last_updated_at:
```

## KOHEE_STATUS

```yaml
KOHEE_STATUS:
  command_id:
  state: QUEUED
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
    status: UNVERIFIED
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

## KOHEE_RECOVERY_TASK

```yaml
KOHEE_RECOVERY_TASK:
  source_task:
  source_pr:
  failure_signature:
  failure_count:
  last_failed_run:
  suspected_area:
  required_analysis:
  do_not_retry_blindly: true
  risk: LOW | MEDIUM
  lane:
  owner: codex
  user_action_required:
```

## Required changes

## Tests

## Touches D1/schema/auth/public API/CSV/deploy? (yes/no + details)

## Remaining risks
