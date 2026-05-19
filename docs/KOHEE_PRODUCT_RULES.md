# KOHEE Product Rules

Last updated: 2026-05-19

## Cafe Lifecycle

- `candidate`: internal review state. Not public.
- `hidden` / hold: internal hold state. Not public.
- `approved`: eligible for public exposure only when `deleted_at IS NULL`.
- `rejected`: not public.
- `deleted`: not public. Recoverable deletion is preferred over hard deletion.

Admin approval is the only normal path from candidate/hold/review state to
public visibility.

## Public Exposure Rule

Public cafe exposure is limited to:

```sql
status = 'approved' AND deleted_at IS NULL
```

Public responses must not include internal review fields, submitter data,
operator/admin identity, evidence, confidence, hidden/deleted metadata, or audit
state.

## Admin Review Console Direction

The admin review console should help an operator compare, verify, hold, reject,
and approve cafes without making accidental public changes.

Expected direction:

- compact review list
- clear candidate/hold/approved separation
- explicit admin approval actions
- no accidental CSV-to-public shortcut
- no public data behavior changes unless separately approved

## Badge Policy

- `오커맨 픽`: product/editorial selection badge when intentionally curated.
- `운영진 픽` or existing legacy `매니저 픽` wording may appear only as
  user-facing copy if already relevant.
- Badge wording must not create or imply new runtime roles.
- Do not add manager permissions or role behavior.

## UI Copy Style

- Korean copy should be short, neutral, and operational.
- Avoid exaggerated claims.
- Prefer clear status/action labels over marketing language.
- Do not claim certainty without evidence.

## Category Criteria

`espresso`:

- Requires evidence or intentional curation that espresso is a strength.
- Do not infer from generic coffee availability.

`drip`:

- Requires evidence or intentional curation that drip/filter coffee is a strength.
- Avoid unsupported "drip is good" claims.

`decaf`:

- Can be curated or preserved if verified, intentionally set, or present in the
  original reviewed data.
- Do not invent decaf support.

`instagram`:

- Use only when the space itself is a meaningful reason to visit.
- Do not use for minor interior details alone.

`dessert`:

- Use only when dessert strength is meaningful.
- Do not infer from a token dessert menu item.

## Unsupported Claims

Avoid unsupported public claims such as:

- `맛있다`
- `유명하다`
- `드립이 좋다`
- `시그니처가 확실하다`

If evidence is uncertain, mark it as uncertain internally instead of asserting it
publicly.
