# KOHEE LIST D1 Migration Readiness Runbook

이 문서는 KOHEE LIST의 D1 migration을 적용하기 전 확인해야 할 준비 상태, 백업 절차, GitHub Actions 처리 정책을 정리한다.

이번 문서는 조사/계획 모드 산출물이다. `schema.sql`, `migrations/**`, 런타임 코드, 원격 D1은 수정하지 않는다.

## 1. 현재 D1 설정

`wrangler.toml` 기준:

- Worker name: `kohee-list`
- D1 binding: `DB`
- D1 database name: `kohee-list`
- D1 database id: 존재함. 보고 시 전체 값을 출력하지 않고 `747d...1826`처럼 마스킹한다.
- Account id: 존재함. 보고 시 전체 값을 출력하지 않고 `af7a...23dc`처럼 마스킹한다.
- Worker frontend origin: `https://kohee.pages.dev`

`wrangler.pages.toml` 기준:

- Pages project name: `kohee`
- Pages output directory: `.pages-deploy`
- Pages 설정에는 D1 binding이 없다.

`package.json` 기준:

- D1 전용 npm script는 없다.
- migration 적용 script도 없다.
- 검증 관련 script는 `preflight`, `format:check`, `verify:release`, `check:deploy-sync`, `test:unit`, `detect:changed`, `smoke:check`가 있다.

## 2. 로컬 schema와 migrations 구성

현재 migration 파일:

- `migrations/0001_initial.sql`
- `migrations/0002_rate_limits.sql`
- `migrations/0003_audit_logs.sql`
- `migrations/0004_session_security.sql`

`schema.sql`은 base schema에 `rate_limits`, `audit_logs`, session security 컬럼까지 반영한 최종 형태다.

현재 `cafes` 테이블에는 lifecycle 필드가 없다.

없는 필드:

- `status`
- `approved_at`
- `approved_by`
- `rejected_at`
- `rejected_by`
- `hidden_at`
- `hidden_by`
- `deleted_at`
- `deleted_by`
- `delete_reason`
- `created_at`

현재 `submissions`에는 `pending`, `approved`, `rejected` status가 있다. 이 status는 사용자 제보 lifecycle이며, `cafes` 공개 lifecycle과 분리해서 다룬다.

## 3. 원격 D1 schema 조회 상태

원격 D1 schema는 읽기 전용 쿼리로 확인하는 것이 이상적이다.

권장 읽기 전용 확인 명령:

```powershell
npx.cmd --no-install wrangler d1 execute kohee-list --remote --command "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY type, name"
npx.cmd --no-install wrangler d1 execute kohee-list --remote --command "PRAGMA table_info(cafes)"
npx.cmd --no-install wrangler d1 execute kohee-list --remote --command "PRAGMA table_info(users)"
npx.cmd --no-install wrangler d1 execute kohee-list --remote --command "PRAGMA table_info(sessions)"
npx.cmd --no-install wrangler d1 execute kohee-list --remote --command "PRAGMA table_info(submissions)"
npx.cmd --no-install wrangler d1 execute kohee-list --remote --command "PRAGMA table_info(audit_logs)"
```

주의:

- 위 명령은 schema 메타데이터 조회용이다.
- `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `CREATE`, `wrangler d1 migrations apply`는 이 단계에서 실행하지 않는다.
- Cloudflare token, account id, database id 전체 값을 로그나 문서에 노출하지 않는다.

현재 확인 결과:

- 로컬 환경에서 `wrangler` 4.85.0 사용 가능.
- 원격 D1 읽기 쿼리는 Cloudflare API 권한 오류로 완료되지 않았다.
- 오류 성격: 현재 인증된 Cloudflare 계정 또는 권한이 대상 account/D1에 유효하지 않음.
- 따라서 로컬 `schema.sql`과 원격 D1 schema의 일치 여부는 아직 확정하지 못했다.

사용자가 Cloudflare Dashboard에서 확인할 항목:

- D1 database `kohee-list`가 현재 Worker `kohee-list`와 같은 계정에 있는지.
- `wrangler.toml`의 account/database 설정이 현재 운영 리소스와 일치하는지.
- 현재 로그인된 wrangler 계정이 해당 account와 D1 database에 접근 권한이 있는지.
- D1 console에서 `cafes`, `users`, `sessions`, `submissions`, `audit_logs`, `rate_limits`, `favorites` schema가 로컬 schema와 같은지.

## 4. Production D1 백업 절차

soft delete/status migration 전에는 production D1 전체 백업이 필수다.

### 백업 대상

전체 D1 export를 권장한다.

필수 포함 대상:

- `cafes`
- `favorites`
- `submissions`
- `users`
- `sessions`
- `audit_logs`
- `rate_limits`
- `error_reports`
- `error_report_replies`
- `settings`

참고:

- 현재 schema에는 별도 `categories` 테이블이 없다.
- category는 `cafes.category`와 `submissions.category`에 JSON 문자열 형태로 저장된다.

### 백업 방법 후보

| 방식                           | 장점                                      | 단점                                            | 권장 용도                   |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------- | --------------------------- |
| Cloudflare Dashboard D1 export | UI에서 확인 가능. 로컬 토큰 노출이 적음   | 수동 절차가 필요함                              | 운영 migration 전 기본 선택 |
| `wrangler d1 export --remote`  | 명령 재현성이 좋음. schema+data 백업 가능 | wrangler 권한 필요. 백업 파일 관리 주의         | 권한 확인 후 사용           |
| `/data` CSV export             | 공개 cafe 데이터만 빠르게 보관 가능       | users/sessions/audit/submissions/favorites 누락 | 보조 백업 전용              |

권장 백업 명령 후보:

```powershell
npx.cmd --no-install wrangler d1 export kohee-list --remote --output .\backups\d1\kohee-list-production-YYYYMMDD-HHMMSS.sql
```

schema-only 확인 후보:

```powershell
npx.cmd --no-install wrangler d1 export kohee-list --remote --no-data --output .\backups\d1\kohee-list-schema-YYYYMMDD-HHMMSS.sql
```

이번 조사에서는 위 백업 명령을 실행하지 않았다.

### 백업 파일 보관 원칙

- 백업 파일은 repo에 커밋하지 않는다.
- `backups/d1/` 같은 로컬 보관 위치를 사용하되 Git 추적 여부를 반드시 확인한다.
- 백업 파일 이름에는 database name, environment, timestamp를 포함한다.
- 백업 파일은 개인정보, 세션, 제보자 정보, 관리자 정보, audit log를 포함할 수 있다.
- 백업 파일을 ChatGPT, GitHub Issue, 로그, PR description에 붙여 넣지 않는다.

### 백업 성공 확인

백업 후 확인할 것:

- 파일이 생성되었는지.
- 파일 크기가 0이 아닌지.
- `CREATE TABLE cafes`, `CREATE TABLE users`, `CREATE TABLE sessions`, `CREATE TABLE submissions`, `CREATE TABLE audit_logs`가 포함되는지.
- `INSERT INTO cafes` 또는 데이터 dump가 포함되는지.
- schema-only 백업과 full-data 백업을 혼동하지 않았는지.

### 복구 절차 개요

복구는 사용자 승인 후 별도 작업으로만 진행한다.

1. 장애 상황을 멈추고 추가 migration을 중단한다.
2. 현재 production D1 상태를 추가 백업한다.
3. Worker/Pages 배포 상태를 확인한다.
4. 백업 SQL을 새 D1 또는 복구 대상 D1에 적용할지 결정한다.
5. 복구 후 `/health`, `/data`, 로그인, admin 주요 flow를 smoke check한다.
6. 복구 결과와 손실 가능성을 보고한다.

## 5. GitHub Actions D1 변경 처리

`scripts/detect-changed-areas.mjs` 기준으로 D1 변경 감지 대상:

- `migrations/**`
- `schema/**`
- `d1/**`
- `schema.sql`
- `*.sql`

D1 변경 시 출력:

- `d1Changed=true`
- `shouldBlockAutoDeployDueToD1=true`
- `shouldDeployPages=false`
- `shouldDeployWorker=false`
- skip reason: `D1/schema changes require manual migration planning.`

현재 `.github/workflows/deploy.yml` 동작:

1. `npm run verify:release` 실행.
2. 변경 영역 감지.
3. D1 변경이 없을 때만 Cloudflare secrets 확인.
4. D1 변경이면 `Block automatic deploy for D1 changes` 단계에서 error를 throw한다.
5. 결과적으로 Deploy workflow가 실패한다.

### 현재 정책 판단

현재 정책은 자동 배포 차단에는 안전하다.

하지만 migration 파일을 main에 올리는 정상 작업도 Deploy workflow를 빨간불로 만든다. 즉, 다음 `schema.sql`/`migrations/**` 구현 커밋을 main에 push하면 의도된 차단이어도 Deploy workflow가 실패로 표시될 가능성이 높다.

### 권장 정책

soft delete/status migration 파일을 만들기 전에 Deploy workflow 정책을 먼저 조정하는 것을 권장한다.

권장 방향:

- D1 변경 감지 시 Pages/Worker deploy는 skip한다.
- workflow는 success로 종료한다.
- Step Summary에 `manual migration required`를 명확히 표시한다.
- Secrets check는 필요 없음으로 처리한다.
- smoke check는 skip한다.
- D1 migration은 자동 적용하지 않는다.

이렇게 하면 migration PR/commit이 빨간불 없이 병합 가능하고, 실제 원격 D1 적용은 별도 승인 절차로 유지된다.

## 6. Migration 준비 상태 체크리스트

| 항목                             | 상태        | 판단                                     |
| -------------------------------- | ----------- | ---------------------------------------- |
| 로컬 schema 파악                 | 완료        | `schema.sql`과 migrations 구성을 확인함  |
| 원격 D1 schema 확인              | 미완료      | wrangler 읽기 쿼리가 권한 오류로 실패    |
| 로컬/원격 schema 일치 여부       | 미확정      | 원격 schema 조회가 필요                  |
| production 백업 절차             | 문서화 완료 | 실제 백업 실행은 아직 안 함              |
| D1 변경 GitHub Actions 정책      | 조정 필요   | 현재는 D1 변경 시 Deploy workflow 실패   |
| migration 파일 추가 가능 여부    | 보류        | workflow 정책과 원격 schema 확인 후 권장 |
| 원격 적용 전 검증 방법           | 계획 가능   | local/dry-run/schema query/backup 기반   |
| rollback 가능성                  | 백업 전제   | 컬럼 추가 rollback은 backup restore 중심 |
| 다음 실행으로 migration 1차 구현 | 아직 비권장 | 선행 차단 요소 2개 있음                  |

최종 판단:

```text
B. migration 구현 전 GitHub Actions D1 처리 정책 수정 필요
C. migration 구현 전 원격 D1 schema/백업 절차 확인 필요
```

## 7. 다음 실행 작업 추천

추천 1순위:

```text
D1 변경 workflow 정책 보강
```

작업 모드:

- 실행 모드

수정 파일:

- `.github/workflows/deploy.yml`
- 필요 시 `docs/CODEX_WORKFLOW.md`
- 필요 시 `docs/D1_MIGRATION_RUNBOOK.md`

금지 사항:

- `schema.sql` 수정 금지
- `migrations/**` 추가/수정 금지
- 원격 D1 적용 금지
- Cloudflare 로컬 배포 금지
- 런타임 코드 수정 금지

검증 기준:

- `npm run format:check`
- `npm run verify:release`
- `npm run check:deploy-sync`
- `npm run test:unit`
- `powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1`
- `node scripts\detect-changed-areas.mjs --working-tree`
- `git diff --check`
- 가능하면 임시 브랜치 또는 로컬 script 검토로 D1 변경 시 workflow가 success+skip 구조인지 확인

예상 GitHub Actions 결과:

- workflow/tooling/docs 변경이면 Pages/Worker 배포 skip.
- 이후 migration 파일 추가 커밋에서는 Deploy workflow가 success로 끝나고 `manual migration required` summary를 남겨야 한다.

원격 D1 적용 여부:

- 없음.

추천 2순위:

```text
원격 D1 schema 확인 수동 작업
```

작업 모드:

- 조사 모드

수정 파일:

- 없음 또는 확인 결과 문서만

필요 조건:

- wrangler가 대상 Cloudflare account/D1에 접근 가능한 계정으로 로그인되어 있어야 한다.
- 또는 Cloudflare Dashboard에서 schema를 수동 확인한다.

원격 D1 적용 여부:

- 없음. 읽기 전용 schema 조회만 허용.

추천 3순위:

```text
soft delete + status migration 파일 1차 구현
```

진입 조건:

- D1 변경 workflow 정책이 success+skip으로 보강됨.
- 원격 D1 schema 일치 또는 차이점이 문서화됨.
- production D1 백업 절차가 실제로 실행 가능함을 확인함.
