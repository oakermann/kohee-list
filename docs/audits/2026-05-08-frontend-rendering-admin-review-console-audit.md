# FRONTEND_RENDERING Audit — Admin Review Console Compact Panel

- Date: 2026-05-08
- Risk: AUDIT
- Lane: FRONTEND_RENDERING
- Scope: Read-only audit of current admin review console structure and smallest safe implementation path.

## 1) Current admin structure summary

Current `admin.html` already contains a **new compact panel shell** named `카페 검수 관리` with tabs (`제보`, `후보`, `보류`, `공개`) and a `review-console-list` mount point. However, the legacy sections still exist below it and remain the primary operational UI areas:

- `2) 제보 검토 / 카페 관리` (submissions list + cafe lifecycle/search/list + edit/new form)
- `3) CSV 운영 (보조)`
- `5) 승인/반려 내역`

So the page is currently a **hybrid**: compact panel exists, but old sections are still rendered and functionally active.

## 2) Current review-related boxes/sections and why they feel scattered

Scattering drivers in current structure:

1. **Review intent split across multiple panels**
   - New compact panel (`review-console-*`) shows one consolidated list by tab.
   - Legacy panel still separately shows pending submissions, cafe management, and edit workflow.

2. **Status mental model split**
   - Tab labels are domain-oriented (`제보/후보/보류/공개`), but legacy controls use lifecycle/search and generic cafe list.

3. **CSV actions physically detached**
   - CSV download/validate/upload/reset actions live in a separate panel, not aligned with tab context.

4. **Reviewed history detached from active review**
   - 승인/반려 history has its own panel and tabs, while compact review panel provides ongoing operational states.

Net result: admin must cross-scroll between panels for one review flow.

## 3) Current data sources/functions by area

### submissions

- Client load/render path in `assets/admin.js`:
  - `loadSubmissions()` fetches `/submissions` and populates `state.submissions`.
  - Legacy `sub-list` and compact `review-console-list` both depend on submissions state.
- Server route and handler:
  - `GET /submissions` in `MANAGER_ROUTES` -> `getSubmissions`.

### candidates

- Candidates are represented in cafes data by lifecycle/status filtering.
- Client source:
  - `loadCafes()` fetches `/cafes?lifecycle=...` and fills `state.cafes`.
  - `renderReviewConsole()` derives candidate rows from `state.cafes`.
- Server route and handler:
  - `GET /cafes` -> `listCafes`.

### hold

- Hold is represented as hidden lifecycle in cafes model (`hidden`, `hidden_at` context).
- Client:
  - Hold rows in compact console are computed from `state.cafes` inside `renderReviewConsole()`.
- Server:
  - State transitions exposed as `/hold-cafe`, `/unhold-cafe` (admin routes).

### approved

- Approved rows derived from cafes state for compact panel `공개` tab.
- Public invariant remains server-side in `/data` filter (`approved` + not deleted).
- Related route:
  - `/approve-cafe` to promote candidates.

### CSV import/export/reset

- Client actions in `assets/admin.js`:
  - `downloadCsv()`, `uploadCsv()`, `resetCsv()`.
- Server routes in `server/routes.js`:
  - `GET /export-csv/candidates-review`
  - `GET /export-csv/hold-review`
  - `GET /export-csv/approved-review`
  - `POST /import-csv`
  - `POST /reset-csv`
- Safety characteristics from lifecycle docs/code:
  - CSV new rows stage as candidate.
  - CSV reset/import must not directly create publicly exposed approved cafes.

## 4) Risky rendering functions and safe DOM/textContent patterns to preserve

### Risky/impactful rendering zones

- `renderReviewConsole()` (compact panel row rendering + tab-specific action composition).
- `renderCafeList()` (legacy row rendering, action wiring).
- Submission/error/reviewed list renderers (multi-source UI states and button handlers).

These functions are risky because they combine:
- user-originated content display (name/address/desc/etc.),
- status/action controls,
- and per-row event bindings.

### Safe patterns currently visible and must be preserved

- Prefer `textContent` and `document.createElement` for user data labels.
- Use `replaceChildren(...)` for deterministic subtree replacement.
- Avoid string-built `innerHTML` for untrusted content.
- Keep data/action binding via IDs/data attributes + explicit event listeners.

Note: `closeCafeForm()`/`prepareNewCafe()` clear a trusted internal container using `innerHTML = ""`; this is not directly user-content rendering, but new compact panel work should continue favoring element APIs and `textContent` for row/body content.

## 5) Existing route/API dependencies

From `server/routes.js`, current admin review console depends on:

- Review/submission area:
  - `GET /submissions`
  - `POST /approve`
  - `POST /reject`
  - `POST /update-submission`
- Cafe lifecycle area:
  - `GET /cafes`
  - `POST /add`, `POST /edit`, `POST /delete`, `POST /restore`
  - `POST /approve-cafe`, `POST /hold-cafe`, `POST /unhold-cafe`
- CSV area:
  - `GET /export-csv/candidates-review`
  - `GET /export-csv/hold-review`
  - `GET /export-csv/approved-review`
  - `POST /import-csv`
  - `POST /reset-csv`

No new API is required for first compact-panel implementation if existing data shape is reused.

## 6) Smallest safe implementation phases

### Phase 1: layout skeleton only, no behavior changes

- Keep current behavior and state untouched.
- Move/compose visible markup so compact `카페 검수 관리` is the top-level review surface.
- Legacy sections remain present but hidden/flagged (non-destructive fallback).

### Phase 2: tab state + existing data reuse

- Keep current `state.reviewConsoleTab` model.
- Route existing loaded data (`state.submissions`, `state.cafes`) into compact rows only.
- Do not alter fetch endpoints or mutation semantics.

### Phase 3: status-specific CSV buttons

- Contextualize CSV actions inside compact panel by active tab:
  - 후보 탭 -> 후보 export 중심
  - 보류 탭 -> 보류 export 중심
  - 공개 탭 -> 공개 export 중심
- Keep backend endpoints unchanged; only remap button visibility/placement.

### Phase 4: row detail expansion/drawer

- Keep one primary row action visible.
- Secondary actions move into expandable details/drawer/menu.
- Preserve all existing mutation handlers and payload shapes.

### Phase 5: cleanup of old scattered boxes

- After parity and tests pass, remove/harden deprecated duplicated boxes.
- Ensure no route/function orphaning and no behavior drift.

## 7) Files/functions likely to change in the first implementation PR

Primary expected change files (smallest path):

- `admin.html`
- `.pages-deploy/admin.html`
- `assets/admin.js`
- `.pages-deploy/assets/admin.js`
- `assets/admin.css`
- `.pages-deploy/assets/admin.css`

Likely touched functions in first PR:

- `renderReviewConsole()`
- review-tab click handling around `review-console-tabs`
- minimal helper(s) for row action grouping
- possibly `init()` wiring for consolidated panel initialization

## 8) Tests needed

For first implementation PR (no behavior change objective):

1. Unit/API safety regression via `npm run test:unit`
2. Rendering safety checks for safe DOM assembly
3. Tab parity checks for 제보/후보/보류/공개
4. Action parity checks (same endpoint/payload semantics)
5. Deploy sync check between root and `.pages-deploy`

## 9) What must not be changed yet

- No server route changes.
- No auth/session/role behavior changes.
- No public API field exposure changes.
- No lifecycle invariant changes.
- No CSV import/reset semantics changes.
- No D1 schema/migration changes.
- No manager-role expansion.

## 10) Recommended first implementation PR prompt

```text
LANE: FRONTEND_RENDERING
RISK: MEDIUM
TASK: Compact admin review console UI consolidation (no behavior change)

GOAL:
Consolidate admin review UI into a single compact panel named "카페 검수 관리" with tabs:
- 제보
- 후보
- 보류
- 공개

SCOPE (ALLOW):
- admin.html
- assets/admin.js
- assets/admin.css
- .pages-deploy/admin.html
- .pages-deploy/assets/admin.js
- .pages-deploy/assets/admin.css

REQUIREMENTS:
1) Keep all runtime behavior, endpoints, and payload semantics unchanged.
2) Reuse existing loaded state data and rendering flows.
3) Keep one primary action per row; place secondary actions in compact auxiliary UI.
4) Preserve safe rendering patterns (textContent / createElement / replaceChildren).
5) Keep root and .pages-deploy synced.

DENY:
- server/** changes
- auth/session/role changes
- CSV semantics changes
- public API behavior changes
- D1/schema/migration changes

VERIFY:
- npm run check:deploy-sync
- npm run test:unit
- git diff --check

REPORT:
Risk / Lane / Commit or PR / Changed files / Changed functions / Tests / Remaining risks
```
