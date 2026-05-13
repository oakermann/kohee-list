# Phase 6B-5 Observability Control Board Contract

Date: 2026-05-13
Status: Phase 6B-5 design contract
Risk: LOW docs/governance

Purpose: define observability, delivery metrics, automation SLOs, health alert design, error monitoring, browser smoke/E2E visibility, incident visibility, customer impact signals, and control-board data-source mapping for the automation platform.

Source relationship:
- Active queue: `docs/queues/AUTOMATION_PLATFORM.md`
- Phase grouping: `docs/AUTOMATION_PLATFORM_WORK_BREAKDOWN.md`
- Enterprise hardening map: `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md`

No runtime behavior, monitoring integration, repository settings, workflow settings, deployment settings, credential, D1/schema, auth/session, CSV, dependency/package/lockfile/install-script, or public `/data` behavior is changed by this document.

## 1. Delivery metrics

The platform should eventually measure delivery health instead of relying on manual impressions.

DORA/DORA-lite metrics:

| Metric | Meaning | Initial source |
| --- | --- | --- |
| deployment frequency | how often production-affecting changes deploy | release/deploy records |
| lead time for changes | PR open to merge/deploy time | GitHub PR timestamps |
| change failure rate | merged/deployed changes causing rollback or incident | incident/recovery records |
| failed deployment recovery time | incident start to mitigation/rollback time | incident timeline |

Automation-specific metrics:

| Metric | Meaning | Initial source |
| --- | --- | --- |
| PR validation time | head SHA to required checks success/fail | GitHub Actions runs/jobs |
| FIX_REQUIRED rate | share of PRs requiring a fix before merge | evidence decision logs |
| HOLD rate | share of tasks held for approval/evidence | issue/PR comments and decision logs |
| blocked-lane count | lanes unable to progress | blocked-lane history |
| risky-change detections | policy candidates flagged as HIGH/HOLD | policy-as-code reports |

Rules:
- Metrics start as docs/audit and GitHub evidence review.
- Do not introduce external metric storage without approval.
- Do not treat metrics as performance targets until definitions are stable.

## 2. Automation SLO design

Automation SLOs describe whether the automation platform itself is usable.

Candidate SLOs:

| SLO | Draft target | Notes |
| --- | --- | --- |
| PR evidence collection freshness | latest evidence within one active review cycle | manual first |
| stuck PR detection | stale PRs detected before next active task | docs/audit first |
| failed check surfacing | failed required checks reported as FIX_REQUIRED/HOLD | GitHub evidence |
| unresolved thread surfacing | unresolved review threads block merge decisions | GitHub evidence |
| queue latency | active queue has a clear next action | queue docs |

Hard rule:
- SLO breach should produce FIX_REQUIRED or HOLD, not silent retries or auto-merge.

## 3. Health alert design

Health alerts should be actionable and low-noise.

Health sources:
- Worker `/health`.
- Worker `/health/db`.
- Worker `/version`.
- public `/data` smoke when relevant.
- Pages HTML/static load smoke.
- GitHub Actions required check status.
- automation queue/check docs consistency.

Alert classes:

| Class | Meaning | Example |
| --- | --- | --- |
| page | immediate owner attention | production health/db failure |
| ticket | should be fixed soon | stale open PR, repeated failed check |
| log | useful for later analysis | transient check delay |

Rules:
- Alerting starts as a design/checklist until destination and secrets are approved.
- Alert destinations must not require production secrets in validation PRs.
- Alerts should include evidence and next action.
- False-positive sources must stay report-only until signal quality is proven.

## 4. Error monitoring design

Error monitoring should separate runtime app errors from automation errors.

Error groups:

| Group | Examples | Default action |
| --- | --- | --- |
| public runtime | public page/API failure | incident triage if user impact |
| admin runtime | admin page/API failure | ticket or incident depending on impact |
| auth/session | login/session failure | HIGH/HOLD for product lane |
| data/public exposure | public/internal field leak | SEV-level review |
| automation workflow | failed check, stuck PR, queue drift | FIX_REQUIRED/HOLD |
| external platform | GitHub/Cloudflare outage or rate limit | HOLD/fallback |

Rules:
- Do not log private/secret data.
- Error monitoring integration requires separate approval if it uses external services or secrets.
- Initial implementation should prefer read-only health/smoke checks.

## 5. Browser smoke and E2E visibility

Browser smoke catches what unit/docs checks miss.

Initial browser smoke candidates:

| Path | Minimum check |
| --- | --- |
| public home | page loads and core static assets resolve |
| admin page | admin static marker loads |
| login page | form visible and no console crash |
| submit page | form visible and no console crash |
| mypage | page loads and no obvious asset failure |
| mobile viewport | main public page usable at narrow width |

E2E candidates after smoke is stable:
- login/session flow.
- cafe submission flow.
- admin review console flow.
- public data field exposure regression.
- error report flow.

Rules:
- Start with smoke before full E2E.
- Browser tests that add dependencies are MEDIUM and require dependency review.
- Production-adjacent E2E that mutates data requires explicit approval.

## 6. Incident visibility

The control board should eventually show incident state.

Incident fields:

```text
incident_id:
severity:
status:
started_at:
current_owner:
affected_area:
user_impact:
rollback_needed:
linked_prs:
linked_checks:
next_action:
```

Incident states:

```text
OPEN -> MITIGATING -> MONITORING -> RESOLVED -> POSTMORTEM_PENDING -> CLOSED
OPEN -> HOLD
```

Rules:
- Incident visibility starts as docs/issue records.
- Do not create automated external incident notifications without approval.
- SEV1/SEV2 incidents should freeze risky automation actions until owner/ChatGPT clears them.

## 7. Customer impact and maintenance signals

Technical signals should map to user/admin impact.

Impact classes:

| Impact | Meaning | Example |
| --- | --- | --- |
| none | internal docs/process only | docs checker update |
| internal | automation/admin-only issue | failed validation workflow |
| admin-facing | admin console degraded | admin page/API issue |
| public-facing | users cannot use public feature | public page/API issue |
| data/security | data exposure or destructive issue | public/internal leak |

Maintenance signal requirements:
- affected audience.
- expected duration if known.
- workaround if available.
- rollback or mitigation status.
- public/user-facing wording separated from internal notes.

## 8. Control-board data-source mapping

Control board MVP should be read-only first.

Data sources:

| Data source | Shows | Notes |
| --- | --- | --- |
| `docs/QUEUE_ROUTER.md` | active lane | repo source of truth |
| `docs/queues/AUTOMATION_PLATFORM.md` | active queue and next phase | repo source of truth |
| `docs/AUTOMATION_PLATFORM_ENTERPRISE_HARDENING.md` | enterprise hardening coverage | repo source of truth |
| GitHub open PRs | active work | GitHub evidence |
| GitHub Actions runs | check health | GitHub evidence |
| review threads | merge blockers | GitHub evidence |
| issue `#23` | automation status and blockers | GitHub evidence |
| health endpoints | runtime status | read-only smoke |
| release/rollback records | operational history | future evidence archive |

MVP widgets:
- active lane.
- current next action.
- open PR count.
- failing required checks.
- unresolved review threads.
- latest merged PR.
- blocked lanes.
- health status summary.
- rollback/incident status.

Rules:
- Control board starts as read-only mapping.
- Runtime dashboard implementation requires separate approval.
- Control board must not expose secrets, private data, or internal product data publicly.

## 9. Completion criteria

This lane is complete when:
- delivery metrics are documented.
- automation SLO design is documented.
- health alert design is documented.
- error monitoring design is documented.
- browser smoke/E2E visibility is documented.
- incident visibility is documented.
- customer impact/maintenance signals are documented.
- control-board data-source mapping is documented.
- no runtime dashboard, monitoring integration, external alerting, dependency, or production setting is changed by this lane.
