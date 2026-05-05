# KOHEE LIST Data Lifecycle Plan

이 문서는 KOHEE LIST의 `cafes` 데이터를 복구 가능한 lifecycle로 전환하기 위한 계획이다.
실제 D1 migration 준비 상태와 백업 절차는 `docs/D1_MIGRATION_RUNBOOK.md`를 함께 확인한다.

이 문서는 lifecycle 설계와 phase별 실행 계획, 그리고 현재 구현 정책을 정리한다.

현재 구현 상태:

- `migrations/0005_cafe_lifecycle.sql`은 `cafes` lifecycle 컬럼과 기본 인덱스를 추가하는 1차 migration 파일이다.
- `schema.sql`은 신규 DB 생성 기준으로 lifecycle 컬럼을 포함한다.
- 원격 D1에는 `0005_cafe_lifecycle.sql`이 적용되어 있다.
- public `/data`는 `status = 'approved' AND deleted_at IS NULL`인 cafe만 반환한다.
- 신규 `/add` 및 status가 없는 신규 CSV row는 `candidate`로 저장된다.
- admin만 candidate cafe를 `/approve-cafe`로 `approved` 승격할 수 있다.
- admin만 candidate cafe를 `/hold-cafe`로 `hidden` 보류 처리하고 `/unhold-cafe`로 다시 `candidate` 상태로 되돌릴 수 있다.
- `deleteCafe`와 `resetCsv`는 recoverable lifecycle 동작으로 처리한다.
- purge/archive는 아직 구현하지 않았으며 별도 위험 작업으로 분리한다.

## 1. 현재 데이터 흐름

### Public data

- `GET /data`는 `server/cafes.js`의 `getData`에서 처리한다.
- 현재 쿼리는 `cafes` 테이블에서 `status = 'approved' AND deleted_at IS NULL` 조건을 만족하는 공개 필드만 선택해 `updated_at DESC`로 반환한다.
- `toCafeResponse`는 반환 필드를 whitelist로 제한한다.

현재 공개 필드:

- `id`
- `name`
- `address`
- `desc`
- `lat`
- `lng`
- `signature`
- `beanShop`
- `instagram`
- `category`
- `oakerman_pick`
- `manager_pick`
- `updated_at`

### Admin/manager cafe mutation

- `POST /add`: `manager`, `admin`이 `cafes` row를 바로 생성한다.
- `POST /edit`: `manager`, `admin`이 기존 `cafes` row를 수정한다.
- `POST /approve-cafe`: `admin`만 candidate cafe를 public 공개 가능한 `approved` 상태로 승격한다.
- `POST /hold-cafe`: `admin`만 active candidate cafe를 public 비노출 `hidden` 보류 상태로 전환한다.
- `POST /unhold-cafe`: `admin`만 active hidden cafe를 다시 `candidate` 상태로 전환한다.
- `POST /delete`: `admin`만 `deleteCafe`를 실행한다.
- `POST /restore`: `admin`만 soft-deleted cafe를 복구한다.
- `POST /reset-csv`: `admin`만 `resetCsv`를 실행한다.
- `POST /import-csv`: `admin`만 CSV import를 실행한다.

### Current deleteCafe

현재 `deleteCafe`는 recoverable soft delete다.

1. 대상 cafe row를 유지한다.
2. `deleted_at`, `deleted_by`, `updated_at`을 기록한다.
3. favorites와 submissions 연결은 물리 삭제하지 않는다.
4. `audit_logs`에 `cafe.delete`를 기록한다.

유지 원칙:

- deleted cafe는 public `/data`에 노출하지 않는다.
- 복구는 같은 cafe id를 살리는 방식으로 유지한다.
- 완전 삭제/purge는 별도 승인된 위험 작업으로만 다룬다.

### Current resetCsv

현재 `resetCsv`는 recoverable lifecycle reset이다.

1. 전체 `cafes` 개수를 센다.
2. active cafe를 `deleted_at` 기반으로 soft delete 처리한다.
3. CSV row를 add/update로 적용한다.
4. status가 없는 신규 CSV row는 `candidate`로 저장한다.
5. 기존 row update는 CSV에 status가 없으면 기존 status를 유지한다.
6. `audit_logs`에 `csv.reset`을 기록한다.

유지 원칙:

- cafe row와 linked references를 물리 삭제하지 않는다.
- 백업 강제, diff, rollback 절차가 API 레벨에서 보장되지 않는다.
- reset 이후 public API는 `approved`이면서 `deleted_at IS NULL`인 cafe만 반환한다.

### Current CSV import

- `server/csv.js`가 CSV를 파싱한다.
- 필수 헤더는 `name`, `address`, `desc`다.
- `id`가 있으면 기존 cafe update를 시도한다.
- `id`가 없고 같은 `name + address`가 있으면 duplicate/update로 처리한다.
- 신규 row는 `cafes`에 insert된다.
- 기존 row는 주요 필드를 update한다.
- dry-run은 preview, duplicateRows, failedRows를 반환한다.
- 적용 후 `audit_logs`에 `csv.import`를 기록한다.

유지 원칙:

- 신규 row는 CSV에 `status`가 없으면 `candidate`로 저장한다.
- CSV가 기존 row를 update할 때 `status`가 없으면 기존 status를 유지한다.
- CSV에서 `status = 'approved'`가 명시된 경우에만 approved로 반영한다.
- CSV에서 누락된 기존 cafe를 유지할지 숨길지 정책이 없다.
- category allowlist, lat/lng range, invalid URL 실패 처리와 연결된 lifecycle 정책이 부족하다.

### Favorites and submissions

- `favorites`는 `cafes(id)`를 FK로 참조하며 `ON DELETE CASCADE`다.
- `submissions.linked_cafe_id`는 `cafes(id)`를 참조하며 `ON DELETE SET NULL`이다.
- 현재 `deleteCafe`와 `resetCsv`는 cafe row를 물리 삭제하지 않으므로 FK cascade와 `ON DELETE SET NULL`이 일반 삭제 흐름에서 실행되지 않는다.

soft delete 전환 시 원칙:

- cafe row를 삭제하지 않으면 FK cascade와 `ON DELETE SET NULL`은 실행되지 않는다.
- public/favorites/admin 조회에서 `deleted_at IS NULL` 필터를 명확히 적용해야 한다.
- 복구 가능성을 살리려면 favorites와 submissions 연결을 기본 유지하는 편이 낫다.

### Audit logs

현재 audit action:

- `cafe.add`
- `cafe.edit`
- `cafe.delete`
- `csv.reset`
- `csv.import`
- `submission.approve`
- `submission.reject`
- `submission.update`

유지 원칙:

- soft delete, restore, reset replacement에서도 audit log는 유지한다.
- `before_json`, `after_json`에 status/deleted 상태 변화를 기록한다.

## 2. 상태 모델 설계

### 상태 후보

권장 `status` 값:

- `candidate`: 후보 데이터. public API에 노출하지 않는다.
- `approved`: 승인된 공개 가능 데이터.
- `hidden`: 운영자가 숨긴 데이터. 삭제는 아니며 public API에 노출하지 않는다.
- `rejected`: 후보 검토 후 반려된 데이터. public API에 노출하지 않는다.

삭제 상태는 `status = 'deleted'`가 아니라 `deleted_at` 계열 필드로 분리하는 것을 권장한다.

### Deleted 표현 방식 비교

| 방식                              | 장점                                                             | 단점                                                                 | public API 필터                              | 복구                       | CSV 충돌                                      | audit log 관계        | migration 난이도 | 실수 위험 |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | -------------------------- | --------------------------------------------- | --------------------- | ---------------- | --------- |
| A. `status`에 `deleted` 포함      | 컬럼 하나로 상태 표현 가능                                       | deleted와 hidden/rejected 의미가 섞임. 이전 status 복원이 어려움     | `status = 'approved'`만 보면 됨              | 이전 상태 저장이 별도 필요 | CSV가 deleted row를 update할 때 의미가 애매함 | status 변경만 기록    | 낮음             | 중간      |
| B. `deleted_at` 별도 컬럼         | 삭제 여부와 공개/검토 상태를 분리. 복구 시 원래 status 유지 가능 | 쿼리마다 `deleted_at IS NULL` 조건 필요                              | `status = 'approved' AND deleted_at IS NULL` | 쉬움                       | deleted row 재등장 정책을 명확히 둘 수 있음   | before/after가 명확함 | 낮음-중간        | 낮음      |
| C. `deleted_cafes` archive 테이블 | active 테이블이 단순함                                           | 이동/복구 로직이 복잡함. FK/favorites/submissions 연결 보존이 어려움 | active 테이블만 조회                         | 복잡함                     | CSV와 archive 중복 판단 필요                  | 두 테이블 audit 필요  | 높음             | 높음      |

### 최종 추천

기본안은 B다.

```text
status: candidate / approved / hidden / rejected
deleted_at: NULL이면 살아 있음, 값이 있으면 삭제됨
```

이유:

- 공개 여부는 `status = 'approved' AND deleted_at IS NULL`로 명확하다.
- 삭제와 승인 상태를 분리해 복구 시 원래 상태를 유지할 수 있다.
- hard delete를 제거하면서 favorites/submissions 연결을 보존할 수 있다.
- D1 migration이 비교적 단순하다.

## 3. DB 필드 설계

| 필드            | 목적                     | nullable                | 기본값              | 기존 row migration 값                                                      | public 노출 | admin 노출 | 인덱스 |
| --------------- | ------------------------ | ----------------------- | ------------------- | -------------------------------------------------------------------------- | ----------- | ---------- | ------ |
| `status`        | 공개/후보/숨김/반려 상태 | NOT NULL                | `approved`          | 기존 공개 cafe는 `approved`                                                | 아니오      | 예         | 예     |
| `approved_at`   | 승인 시각                | NULL 가능               | 없음                | 기존 row는 migration 시 `updated_at` 또는 NULL 중 선택. 권장: `updated_at` | 아니오      | 예         | 선택   |
| `approved_by`   | 승인자                   | NULL 가능               | 없음                | 기존 row는 NULL                                                            | 아니오      | 예         | 아니오 |
| `rejected_at`   | 반려 시각                | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 아니오 |
| `rejected_by`   | 반려자                   | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 아니오 |
| `hidden_at`     | 숨김 처리 시각           | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 선택   |
| `hidden_by`     | 숨김 처리자              | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 아니오 |
| `deleted_at`    | soft delete 시각         | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 예     |
| `deleted_by`    | 삭제 처리자              | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 아니오 |
| `delete_reason` | 삭제 사유                | NULL 가능               | 없음                | NULL                                                                       | 아니오      | 예         | 아니오 |
| `created_at`    | cafe 생성 시각           | NULL 가능 또는 NOT NULL | 없음 또는 현재 시각 | 기존 row는 `updated_at` 권장                                               | 아니오      | 예         | 선택   |
| `created_by`    | 생성자                   | 기존 필드               | 기존 유지           | 기존 유지                                                                  | 아니오      | 예         | 아니오 |

### 기존 row 기본값 판단

현재 운영 중인 `cafes`는 이미 public `/data`로 노출되고 있으므로 migration 시 기본 `status = 'approved'`가 현실적이다.

`candidate`는 신규 제보/후보 등록/CSV 후보 workflow에만 사용한다.

### Cafe 검증 및 category 부여 정책

KOHEE LIST는 넓은 지도/리뷰/광고 디렉터리가 아니라 큐레이션된 cafe selection 서비스다. `candidate` cafe는 public 노출 전에 내부 검증을 거쳐야 하며, admin approval이 있어야 `approved`로 승격된다.

검증 원칙:

- `candidate` cafe는 내부 검증 전 public API에 노출하지 않는다.
- admin approval은 public 노출을 허용하는 명시적 결정이다.
- public 응답에는 내부 메모, 선정 근거, 제보자 정보, 관리자 정보, audit/security 정보를 노출하지 않는다.
- category는 단순 메뉴 존재가 아니라 KOHEE LIST 기준에 맞는 근거와 강도에 따라 부여한다.

category별 검증 강도:

| category    | 검증 기준                                                                         |
| ----------- | --------------------------------------------------------------------------------- |
| `espresso`  | espresso 품질/정체성을 뒷받침하는 정밀한 근거가 필요하다.                         |
| `drip`      | drip/hand brew 중심성이 확인되는 정밀한 근거가 필요하다.                          |
| `decaf`     | decaf 제공과 서비스 적합성이 확인되는 일반 tag-fit 검증이 필요하다.               |
| `instagram` | 공간/시각적 특성이 tag와 맞는지 확인하는 일반 tag-fit 검증이 필요하다.            |
| `dessert`   | dessert가 방문 이유가 될 정도로 어울리는지 확인하는 일반 tag-fit 검증이 필요하다. |

`espresso`와 `drip`은 단순히 메뉴에 존재한다는 이유만으로 부여하지 않는다. `decaf`, `instagram`, `dessert`도 public 노출 전 후보 검토에서 category-fit을 확인한다.

### 추천 인덱스

권장:

- `idx_cafes_public_lifecycle(status, deleted_at, updated_at DESC)`
- `idx_cafes_deleted_at(deleted_at)`
- `idx_cafes_status_updated(status, updated_at DESC)`

D1/SQLite에서 partial index를 사용할 수 있는지 확인한 뒤 가능하면 public 조회 최적화용 partial index도 검토한다.

## 4. Public/admin API 정책

### Public API

`GET /data` 조건:

```sql
WHERE status = 'approved'
  AND deleted_at IS NULL
```

이 조건은 정책이다. 실제 `server/cafes.js` public query 반영은 다음 실행 phase에서 수행한다.

반환 가능 필드:

- `id`
- `name`
- `address`
- `desc`
- `lat`
- `lng`
- `signature`
- `beanShop`
- `instagram`
- `category`
- `picks`
- `updated_at`

반환 금지 필드:

- `internalMemo`
- `selectionReason`
- `sourceUrls`
- `evidenceLevel`
- `confidence`
- `uncertainty`
- `submitter` 정보
- `created_by`
- `updated_by`
- `approved_by`
- `deleted_by`
- `delete_reason`
- admin/manager 정보

### Favorites API

`GET /favorites`는 deleted/비공개 cafe를 기본 제외한다.

권장 조건:

```sql
JOIN cafes c ON c.id = f.cafe_id
WHERE f.user_id = ?
  AND c.status = 'approved'
  AND c.deleted_at IS NULL
```

`POST /favorite`도 승인/미삭제 cafe만 추가 가능해야 한다.

### Admin/manager API

관리 화면은 상태 필터를 가진다.

권장 필터:

- `candidate`
- `approved`
- `hidden`
- `rejected`
- `deleted`
- `all-active`

권장 규칙:

- `deleted`는 `deleted_at IS NOT NULL`이다.
- `all-active`는 `deleted_at IS NULL`이다.
- deleted 목록 조회와 restore는 admin만 허용하는 것을 권장한다.
- manager는 add/edit/approve 중심으로 두고, delete/import/reset 권한은 재검토한다.

권한 기준:

- `user`: public 조회, 본인 제출/즐겨찾기.
- `manager`: 후보 검토, 승인/반려, 일반 수정. delete/restore/reset은 제한 검토.
- `admin`: delete/restore/reset/import 정책 변경 포함.

`super_admin`은 도입하지 않는다.

## 5. deleteCafe / restoreCafe 설계

### deleteCafe 권장 변경 방향

금지:

- `DELETE FROM cafes`
- 자동 favorites 삭제
- 자동 submissions 연결 해제

권장:

1. 대상 cafe를 조회한다.
2. 이미 `deleted_at IS NOT NULL`이면 idempotent하게 성공 또는 409를 반환한다.
3. `deleted_at = nowIso()`
4. `deleted_by = current user id`
5. `delete_reason = cleanText(body.reason, 500)` 선택 저장
6. `updated_at = nowIso()`
7. audit log `cafe.delete`에 before/after 기록

권장 권한:

- 1차 구현에서는 `admin`만 delete 허용을 권장한다.
- 현재 manager delete 권한을 유지해야 한다면, 별도 정책 확인 후 유지한다.

### Favorites 처리 비교

| 방식                   | 장점                             | 단점                                                    | 추천   |
| ---------------------- | -------------------------------- | ------------------------------------------------------- | ------ |
| 삭제 시 favorites 유지 | 복구 시 사용자 즐겨찾기가 복원됨 | deleted cafe가 favorites 조회에 나오지 않도록 필터 필요 | 권장   |
| 삭제 시 favorites 제거 | public/user 데이터가 단순함      | 복구해도 사용자 즐겨찾기 복원 불가                      | 비권장 |

### Submissions 연결 처리 비교

| 방식                    | 장점                     | 단점                                               | 추천   |
| ----------------------- | ------------------------ | -------------------------------------------------- | ------ |
| `linked_cafe_id` 유지   | 승인 이력과 연결 보존    | deleted cafe 조회 시 admin 화면에서 상태 표시 필요 | 권장   |
| `linked_cafe_id = NULL` | 삭제 후 연결 위험이 없음 | 복구/감사 맥락 손실                                | 비권장 |

### restoreCafe 필요 여부

restore 기능은 필요하다.

권장:

1. `deleted_at IS NOT NULL` cafe만 restore 가능.
2. `deleted_at = NULL`
3. `deleted_by = NULL`
4. `delete_reason = NULL` 또는 별도 audit에만 유지.
5. `updated_at = nowIso()`
6. audit log `cafe.restore` 기록.

복구 후 status 정책:

- 기본 권장: `hidden`으로 복구.
- 이유: 삭제된 cafe가 복구 즉시 public에 노출되는 사고를 막기 위해서다.
- admin이 명시적으로 공개 복구를 선택한 경우에만 `approved`로 복구한다.

## 6. resetCsv 설계

`resetCsv`는 가장 위험하므로 기존 전체 hard delete를 유지하지 않는다.

### 비교

| 방식                           | 장점                                        | 단점                             | 추천      |
| ------------------------------ | ------------------------------------------- | -------------------------------- | --------- |
| A. resetCsv 유지 + 백업 강제   | 현재 운영 방식과 가까움                     | 여전히 대량 변경 위험이 큼       | 임시 방안 |
| B. soft reset                  | 복구 가능. 기존 endpoint 유지 가능          | public에서 전체가 사라질 수 있음 | 가능      |
| C. CSV replace workflow로 대체 | diff/preview/confirm/rollback을 명확히 분리 | 구현량이 큼                      | 최종 권장 |
| D. confirm phrase 요구         | 실수 방지                                   | 단독으로는 복구/검증 부족        | 보조 필수 |

### 최종 권장

`resetCsv`는 장기적으로 폐기하고 CSV replace workflow로 전환한다.

1차 안전화에서는 다음을 적용한다.

- admin 전용 유지.
- 적용 전 CSV 백업 필수.
- dry-run 필수.
- 변경 diff 제공.
- confirm phrase 필수.
- hard delete 금지.
- 전체 삭제 대신 기존 active cafes를 `hidden` 또는 soft-deleted 상태로 전환.
- audit log에 affected count, backup id/path, confirm phrase 통과 여부 기록.

### Favorites/submissions 영향

- soft reset에서는 favorites와 submissions 연결을 유지한다.
- public/favorites 조회에서 hidden/deleted cafe를 제외한다.
- rollback은 status/deleted_at을 이전 snapshot으로 되돌리는 방식이 되어야 한다.

## 7. CSV import와 상태 모델 연결

### 신규 CSV row

권장 기본값:

- CSV에 `status`가 없으면 신규 row는 `candidate`
- CSV가 기존 row를 update하면 기존 `status` 유지
- CSV에서 `status = 'approved'`가 명시된 경우에만 approved로 반영

안전 기본안:

- CSV import는 기본 `candidate`로 넣고, `publish=1` 또는 admin confirm이 있을 때만 `approved`로 넣는다.

현재 구현 기준:

- `/add`로 생성되는 신규 cafe는 `candidate`로 저장한다.
- 신규 CSV row는 `status`가 비어 있으면 `candidate`로 저장한다.
- 기존 CSV duplicate/update row는 `status`가 비어 있으면 기존 row의 `status`를 유지한다.
- resetCsv에서 기존 row를 재활성화할 때도 `status`를 무조건 `approved`로 바꾸지 않는다.
- CSV로 공개 상태를 만들려면 `status` 컬럼에 `approved`가 명시되어 있어야 한다.
- admin만 `/approve-cafe`로 candidate cafe를 `approved`로 승격할 수 있다.
- admin만 `/hold-cafe`와 `/unhold-cafe`로 active cafe의 `candidate`와 `hidden` 상태를 오갈 수 있다.
- manager/user는 cafe를 public 노출 상태로 승인할 수 없다.

### 기존 approved cafe update

- 기존 row의 `status`는 유지한다.
- `deleted_at IS NOT NULL` row는 일반 update 대상에서 제외하거나 `restore/update` 명시 옵션을 요구한다.

### CSV에서 누락된 기존 cafe

옵션:

- 유지: 가장 안전하지만 replace 의미가 약함.
- hidden 처리: public에서 제외되지만 복구 가능.
- soft delete 처리: 삭제 의미가 강함.

권장:

- 일반 import는 누락 row를 유지한다.
- replace workflow에서만 누락 row를 `hidden` 처리한다.
- soft delete는 명시 삭제/confirm이 있을 때만 사용한다.

### Deleted cafe와 같은 name/address가 들어오는 경우

권장:

- dry-run에서 `wouldRestoreOrConflict`로 별도 표시한다.
- 자동 복구하지 않는다.
- admin이 `restore` 또는 `create-new`를 선택하게 한다.

### Validation 연결

CSV lifecycle 전에 보강할 검증:

- category allowlist: `espresso`, `drip`, `decaf`, `instagram`, `dessert`
- lat/lng 숫자 및 범위
- beanShop/instagram URL이 http/https인지 확인
- invalid URL을 조용히 빈 값으로 만들지 말고 failed row 또는 warning으로 표시
- duplicate 기준: `name + address` 기본, 좌표 유사성은 추후

## 8. Migration 계획

실제 migration 파일은 이 문서에서 만들지 않는다.

### 1. 원격 D1 백업

적용 전 필수:

- 현재 production D1 export 또는 CSV backup 생성
- `/data` CSV export만으로는 삭제/상태/관리 필드가 부족할 수 있으므로 D1 전체 백업 방법을 별도로 확인
- backup artifact 이름과 생성 시각 기록
- 복구 명령을 문서화

### 2. Migration 전 확인

- 원격 D1 schema가 로컬 `schema.sql` + migrations와 일치하는지 확인
- `cafes` row count
- `favorites` row count
- `submissions.linked_cafe_id IS NOT NULL` count
- duplicate `name + address` count
- category 허용값 외 데이터 존재 여부

### 3. 추가 컬럼 후보

예상 방향:

```sql
ALTER TABLE cafes ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE cafes ADD COLUMN approved_at TEXT;
ALTER TABLE cafes ADD COLUMN approved_by TEXT;
ALTER TABLE cafes ADD COLUMN rejected_at TEXT;
ALTER TABLE cafes ADD COLUMN rejected_by TEXT;
ALTER TABLE cafes ADD COLUMN hidden_at TEXT;
ALTER TABLE cafes ADD COLUMN hidden_by TEXT;
ALTER TABLE cafes ADD COLUMN deleted_at TEXT;
ALTER TABLE cafes ADD COLUMN deleted_by TEXT;
ALTER TABLE cafes ADD COLUMN delete_reason TEXT;
ALTER TABLE cafes ADD COLUMN created_at TEXT;
```

주의:

- SQLite/D1의 `ALTER TABLE ADD COLUMN` 제약을 확인한다.
- `CHECK` constraint를 새 컬럼에 바로 강제할 수 있는지 확인한다.
- `created_at`을 NOT NULL로 추가하려면 기존 row backfill 문제가 있으므로 단계 분리가 필요하다.

### 4. 기존 row 기본값

권장:

- `status = 'approved'`
- `deleted_at = NULL`
- `approved_at = updated_at`
- `approved_by = NULL`
- `created_at = updated_at`

### 5. 인덱스 후보

```sql
CREATE INDEX IF NOT EXISTS idx_cafes_lifecycle_public
ON cafes(status, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cafes_deleted_at
ON cafes(deleted_at);
```

### 6. 적용 순서

1. 백업 생성.
2. 원격 schema 확인.
3. migration dry-run 또는 local D1 적용.
4. 컬럼 추가.
5. 기존 row backfill.
6. 인덱스 추가.
7. public query 필터 코드 적용.
8. deleteCafe soft delete 적용.
9. tests/smoke 검증.
10. 원격 적용은 사용자 승인 후 별도 수행.

### 7. 검증 쿼리 후보

```sql
SELECT COUNT(*) FROM cafes;
SELECT COUNT(*) FROM cafes WHERE status = 'approved' AND deleted_at IS NULL;
SELECT COUNT(*) FROM cafes WHERE deleted_at IS NOT NULL;
SELECT status, COUNT(*) FROM cafes GROUP BY status;
SELECT COUNT(*) FROM favorites f LEFT JOIN cafes c ON c.id = f.cafe_id WHERE c.id IS NULL;
SELECT COUNT(*) FROM submissions WHERE linked_cafe_id IS NOT NULL;
```

### 8. Rollback 가능성

- 컬럼 추가 migration은 간단히 되돌리기 어렵다.
- 안전한 rollback은 DB backup restore가 기본이다.
- 코드 rollback만으로는 추가 컬럼이 남지만 대체로 호환 가능하다.
- migration 실패 시 즉시 원격 D1 복구 절차를 따른다.

### 9. 실패 시 복구

1. 배포 중단.
2. public `/data`와 `/health` 확인.
3. 원격 D1 backup restore 여부 판단.
4. migration 적용 전 commit으로 Worker rollback.
5. audit log와 backup 이름을 보고.

## 9. 테스트 계획

현재 lifecycle 구현에서 유지해야 할 테스트 기준:

- public API가 `deleted_at IS NOT NULL` cafe를 제외한다.
- public API가 `status != 'approved'` cafe를 제외한다.
- public API field whitelist가 유지된다.
- `deleteCafe`가 `DELETE FROM cafes`를 사용하지 않는다.
- `deleteCafe`가 `deleted_at`, `deleted_by`를 기록한다.
- `restoreCafe`가 `deleted_at`을 `NULL`로 복구한다.
- restore가 기존 status를 임의로 public 승격하지 않는다.
- `resetCsv`가 hard delete하지 않는다.
- CSV import가 기존 `status`를 의도 없이 바꾸지 않는다.
- CSV import가 status 없는 신규 row를 `candidate`로 저장한다.
- CSV import/update/reset이 status를 의도 없이 `approved`로 강제하지 않는다.
- favorites 조회가 hidden/deleted cafe를 제외한다.
- favorite add가 hidden/deleted cafe를 거부한다.
- manager/admin 권한 차이를 확인한다.
- audit log가 delete/restore/reset/import를 기록한다.

테스트 파일 후보:

- `scripts/test-unit.mjs`
- 별도 `tests/`가 도입된다면 `tests/cafe-lifecycle.test.mjs`
- smoke 범위 확장이 필요하면 `scripts/smoke-test.ps1`

## 10. 단계별 실행 계획

### Phase 1. migration 문서/백업 확인

- 목표: 실제 원격 적용 전에 백업/복구 절차 확정.
- 상태: 완료.
- 수정 파일: docs 또는 운영 문서만.
- 위험도: 낮음.
- 검증: 문서 변경만, `npm run verify:release`.
- rollback: 문서 commit revert.

### Phase 2. schema/migration 추가

- 목표: `cafes` lifecycle 컬럼과 인덱스 추가.
- 상태: 완료.
- 수정 파일: `schema.sql`, `migrations/**`.
- 위험도: 높음.
- 검증: local D1 또는 dry-run, schema consistency, unit tests.
- rollback: 원격 적용 전이면 commit revert. 원격 적용 후면 D1 backup restore 계획 필요.

### Phase 3. public API 필터 추가

- 목표: public `/data`가 approved + not deleted만 반환.
- 상태: 완료.
- 수정 파일: `server/cafes.js`, 필요 시 `server/favorites.js`.
- 위험도: 중간.
- 검증: public API 필터 테스트, smoke `/data`.
- rollback: query 필터 commit revert.

### Phase 4. soft delete + restore

- 목표: `DELETE FROM cafes` 제거.
- 상태: 완료.
- 수정 파일: `server/cafes.js`.
- 위험도: 중간-높음.
- 검증: delete 테스트, audit log 테스트, public 제외 확인.
- rollback: soft delete 코드 revert. DB 컬럼은 유지.

### Phase 5. restoreCafe/admin UI 최소 연결

- 목표: 삭제된 cafe 복구 경로 제공.
- 상태: 완료.
- 수정 파일: `server/cafes.js`, `server/routes.js`, `assets/admin.js`, `.pages-deploy/assets/admin.js`, 필요 HTML.
- 위험도: 중간.
- 검증: admin 권한, restore 후 public 비노출 기본, admin 목록 확인.
- rollback: restore route/UI revert.

### Phase 6. resetCsv hard delete 제거

- 목표: hard reset 제거와 replace workflow 기반 전환.
- 상태: 완료.
- 수정 파일: `server/cafes.js`, `server/csv.js`, admin assets, scripts.
- 위험도: 높음.
- 검증: dry-run, confirm phrase, backup 존재 확인, audit log.
- rollback: 기존 endpoint 복구 전에는 원격 적용 금지. 적용 후에는 DB backup 필요.

### Phase 6.5. purge/archive 정책 구현

- 목표: soft deleted 데이터가 장기간 누적될 때 안전하게 완전 삭제하거나 archive하는 별도 위험 작업을 제공한다.
- 상태: 미구현. 별도 승인된 위험 작업으로만 진행한다.
- 수정 파일: 별도 설계 후 결정한다.
- 위험도: 높음.
- 검증: dry-run, confirm phrase, admin-only 권한, backup 존재 확인, audit log 확인.
- rollback: purge는 되돌리기 어렵기 때문에 production D1 전체 백업과 archive export가 선행되어야 한다.

Purge/archive 원칙:

- 기본 삭제는 soft delete다.
- 즉시 hard delete는 금지한다.
- purge는 admin만 가능해야 한다.
- purge 전 production D1 백업은 필수다.
- purge 전 dry-run과 confirm phrase는 필수다.
- purge 대상은 `deleted_at`이 일정 기간 지난 항목으로 제한하는 것을 권장한다. 예: 90일 또는 180일 이상.
- purge 전 favorites/submissions 연결 상태를 확인해야 한다.
- purge 실행 시 audit log는 필수다.
- 장기적으로 `cafes_archive` 테이블 또는 별도 export archive 방식을 검토한다.
- `resetCsv`는 purge가 아니라 replace/hidden workflow로 다룬다.

### Phase 7. CSV import 상태 정책 연결

- 목표: CSV import가 status/deleted 정책을 지키도록 변경.
- 상태: 완료.
- 수정 파일: `server/csv.js`, admin assets, tests.
- 위험도: 중간.
- 검증: duplicate/deleted/candidate/import tests.
- rollback: CSV import 관련 commit revert.

### Phase 8. 테스트 확대

- 목표: lifecycle 회귀 방지.
- 상태: 진행 중. 현재 핵심 lifecycle unit test는 `scripts/test-unit.mjs`에 포함되어 있다.
- 수정 파일: `scripts/test-unit.mjs`, 필요 시 `tests/**`, smoke scripts.
- 위험도: 낮음-중간.
- 검증: `npm run test:unit`, `npm run verify:release`.
- rollback: test commit revert.

## 11. 완료된 1차 실행 프롬프트 기록

아래 초안은 lifecycle 1차 구현 전 작성된 기록이다. 현재는 migration 적용, public 필터, soft delete, restore, resetCsv 안전화, CSV status 정책, admin approval flow가 구현되어 있다. 다음 작업 지시로 재사용하지 않는다.

```text
[목표]
KOHEE LIST의 soft delete + approved 상태 migration 1차 구현을 수행한다.

[작업 종류]
DB / migration 작업 + 안정화 작업.
단, 원격 D1 적용은 하지 않는다.

[작업 범위]
수정 가능:
- schema.sql
- migrations/<next>_cafe_lifecycle.sql
- server/cafes.js
- server/favorites.js
- scripts/test-unit.mjs
- docs/DATA_LIFECYCLE_PLAN.md는 결과 반영이 꼭 필요할 때만

수정 금지:
- 원격 D1 적용
- Cloudflare 로컬 배포
- role/category 추가
- super_admin 추가
- 새우톤 추가
- UI 문구 변경
- resetCsv 대규모 개편
- CSV replace workflow 구현

[금지 사항]
- DELETE FROM cafes 신규 추가 금지
- public API에 내부 필드 노출 금지
- D1 migration 자동 적용 금지
- force push 금지

[구현 요구사항]
1. cafes lifecycle 컬럼 추가 migration 파일을 작성한다.
2. schema.sql에 동일한 최종 schema를 반영한다.
3. 기존 cafe 기본 status는 approved로 둔다.
4. public /data는 status = 'approved' AND deleted_at IS NULL만 반환한다.
5. favorites 조회와 추가도 approved + not deleted cafe만 허용한다.
6. deleteCafe는 hard delete 대신 deleted_at/deleted_by/delete_reason을 기록한다.
7. restoreCafe는 이번 1차 구현에서 route만 추가할지, 별도 phase로 둘지 작업 전 보고한다.
8. audit log를 유지한다.
9. 테스트를 추가한다.

[검증 기준]
- npm run format:check
- npm run verify:release
- npm run check:deploy-sync
- npm run test:unit
- powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1
- node scripts\detect-changed-areas.mjs --working-tree
- git diff --check
- D1 변경 감지 시 자동 배포 차단이 정상인지 확인

[Git 작업]
검증 통과 후 변경 파일만 add.
커밋 메시지:
feat: add cafe lifecycle migration groundwork
일반 git push.
push 거부 시 merge/rebase/force push 금지, 차이 보고 후 중단.

[Cloudflare 배포]
로컬 wrangler deploy 금지.
원격 D1 migration 적용 금지.
GitHub Actions에서 D1 변경으로 자동 배포가 차단되는 것이 정상.

[보고 형식]
1. 변경 요약
2. preflight 결과
3. 변경 파일
4. 추가한 DB 필드
5. public API 필터 결과
6. deleteCafe soft delete 전환 결과
7. favorites 정책 반영 결과
8. 테스트 결과
9. 변경 영역 감지 결과
10. D1 자동 배포 차단 여부
11. 커밋 해시
12. push 성공 여부
13. 원격 D1에 아무 작업도 하지 않았는지 여부
14. 추가 확인 필요한 부분
15. 위험/주의 사항
```
