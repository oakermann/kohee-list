# Project Profiles

Status: project-factory profile index v0
Risk: LOW docs/profile

Purpose: declare which repositories are managed by the automation platform and keep project-specific risk rules out of the generic rail.

## Active managed project

| Project | Profile | Status |
| --- | --- | --- |
| KOHEE LIST | `docs/project-profiles/kohee-list.json` | first managed project |

## Placeholder projects

These are placeholders only. Do not route work to them until each has a real profile, repository, active queue, risk policy, test commands, and forbidden-area list.

| Project | Status |
| --- | --- |
| News app | placeholder only |
| Handover/internal work app | placeholder only |
| Blog/status site | placeholder only |

## Profile rule

Every managed project profile must declare:

- repository and default branch.
- active queue and lane.
- allowed LOW/MEDIUM automation scope.
- HIGH/HOLD forbidden areas.
- required validation commands.
- deploy policy.
- project-specific invariants.

Missing or placeholder profile data means HOLD, not automatic execution.
