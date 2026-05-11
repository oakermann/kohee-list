# GitHub App Worker Phase 3 Plan

Status: proposed
Risk: MEDIUM / AUTOMATION_CONNECTIVITY
Track: MOBILE_TRACK for design, LOCAL_TRACK for implementation and verification

Phase 3 is not enabled yet.

## Goal

Phase 3 adds a narrow, safe issue-comment bridge after Phase 2 dry-run webhook evidence is stable.

It exists to reduce manual comment/status work, especially cases where ChatGPT cannot post `@codex` trigger comments through the connector.

## Scope

Allowed candidate behavior:

- add issue comments for safe automation status updates
- add `KOHEE_STATUS` comments
- add safe `@codex` trigger comments only when all denylist checks pass
- record blockers on the relevant issue or PR

Not allowed in Phase 3:

- repo file writes
- branch creation
- PR creation
- PR merge
- auto-merge enablement
- issue close
- label mutation unless separately approved
- production Worker/Pages/D1 changes
- secrets or permission changes

## Eligibility

A comment action is eligible only when:

- risk is LOW or MEDIUM
- repo is `oakermann/kohee-list`
- task is not HIGH/HOLD
- user approval is not required
- command format is valid
- denylist paths and behaviors are absent
- Phase 2 dry-run decision would allow the same action

Denylist examples:

- D1/schema/migrations
- auth/session/security
- public `/data` or public API exposure
- CSV import/reset semantics
- destructive data behavior
- production deploy workflows/secrets
- GitHub App write broadening beyond comment-only
- branch deletion
- issue close

## Required safety model

- Phase 3 must start with dry-run comparison before enabling comment writes.
- Comment text must be deterministic and short.
- No secret values may appear in comments or logs.
- All comment actions must include an evidence link or event reference.
- HIGH/HOLD must be recorded as blocked, not triggered.

## Suggested rollout

1. Add dry-run-only Phase 3 policy tests.
2. Add comment payload builder without sending comments.
3. Add `KOHEE_BOT_COMMENT_ENABLED=false` flag.
4. Verify dry-run decisions from harmless issue/comment events.
5. Enable comment writes only in a later PR after user approval.

## Exit criteria

Phase 3 can be considered ready only after:

- Phase 2 webhook delivery is verified with 200 responses.
- dry-run decisions match expected comment/no-comment outcomes.
- self-event ignore works.
- HIGH/HOLD cases are blocked.
- GitHub App permissions remain minimal and comment-focused.

## Phase 4 boundary

Auto-merge is not part of Phase 3.

Phase 4 may later consider native GitHub auto-merge enablement for verified safe PRs only after Phase 3 status/comment flow is stable.
