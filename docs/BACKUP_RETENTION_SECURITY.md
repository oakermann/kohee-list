# KOHEE LIST Backup Retention and Security Policy

이 문서는 KOHEE LIST의 D1 백업, 복구 확인, 보관 기간, 백업 파일 보안 원칙을 정리한다.

## 1. 백업이 필요한 시점

D1 백업은 운영 데이터 손실 가능성이 있는 작업 전에 만든다.

필수 백업 시점:

- D1 schema 또는 `migrations/**` 변경을 원격 D1에 적용하기 전
- `deleteCafe`, `restoreCafe`, `resetCsv`, CSV import처럼 cafe lifecycle이나 대량 데이터를 바꾸는 Worker 변경 전
- public/admin API의 데이터 노출 조건을 바꾸는 위험 작업 전
- 권한, 인증, session, audit log처럼 운영 복구에 필요한 데이터를 다루는 Worker 변경 전
- purge/archive 같은 영구 삭제 작업을 별도 승인해 실행하기 전
- 원격 D1에 수동 쓰기 작업을 실행하기 전

권장 백업 시점:

- risky Worker 변경을 `main`에 push하기 전
- release smoke check에서 데이터 이상이 확인되어 복구 가능성을 열어 둬야 할 때
- 운영 DB schema와 로컬 `schema.sql`/migrations 일치 여부를 검증하기 전

## 2. 백업 저장 위치

백업 파일은 기본적으로 repo 밖에 저장한다.

권장 위치:

```text
F:\KOHEE-LIST\backups\d1\
```

권장 파일명:

```text
kohee-list-production-YYYYMMDD-HHMMSS.sql
kohee-list-schema-YYYYMMDD-HHMMSS.sql
```

원칙:

- 백업 파일을 repo에 저장하지 않는다.
- 백업 파일을 GitHub Issue, PR, Actions log, ChatGPT 대화, 문서에 붙여 넣지 않는다.
- 백업 파일에는 `users`, `sessions`, `submissions`, `audit_logs` 등 민감 정보가 포함될 수 있다고 간주한다.
- repo 내부에 임시 백업을 둘 수밖에 없다면 먼저 `.gitignore` 보호 여부를 확인하고, 작업 후 repo 밖으로 옮기거나 삭제한다.
- `git status --short`에 백업 파일이 나타나면 커밋하지 않고 중단한다.

## 3. 보관 기간

권장 보관 기준:

- D1 migration 직전 full backup: 최소 90일 보관
- D1 migration 직전 schema-only backup: 최소 90일 보관
- 최근 성공한 production full backup: 최소 3개 보관
- purge/archive처럼 복구가 어려운 위험 작업 전 백업: 최소 180일 보관
- 임시 점검용 백업: 작업 완료와 검증 후 7일 이내 삭제 가능

백업 삭제 원칙:

- 삭제 전에 같은 기간을 덮는 더 최신 백업이 있는지 확인한다.
- migration, purge, resetCsv 관련 장애 조사가 열려 있으면 삭제하지 않는다.
- 공유 드라이브나 외부 저장소에 올릴 경우 접근 권한을 최소화한다.

## 4. 백업 생성과 확인

권장 full backup:

```powershell
npx.cmd --no-install wrangler d1 export kohee-list-db --remote --output F:\KOHEE-LIST\backups\d1\kohee-list-production-YYYYMMDD-HHMMSS.sql
```

권장 schema-only backup:

```powershell
npx.cmd --no-install wrangler d1 export kohee-list-db --remote --no-data --output F:\KOHEE-LIST\backups\d1\kohee-list-schema-YYYYMMDD-HHMMSS.sql
```

백업 후 확인:

- 파일이 존재한다.
- 파일 크기가 0보다 크다.
- 파일 위치가 repo 밖이다.
- `git status --short`에 백업 파일이 나타나지 않는다.
- 백업 파일 내용을 터미널, 로그, 채팅에 출력하지 않는다.

## 5. 복구 검증 절차

복구는 production DB에 바로 덮어쓰지 않는다. 사용자 승인 후 별도 작업으로 진행한다.

검증 순서:

1. 장애 직후 현재 production D1 상태를 추가 백업한다.
2. 복구 대상 백업 파일의 존재와 크기를 확인한다.
3. 가능하면 새 D1 또는 staging/local D1에 먼저 복원한다.
4. `sqlite_master`와 `PRAGMA table_info`로 schema를 확인한다.
5. `/health`, public `/data`, 로그인, admin 주요 flow를 smoke check한다.
6. public API가 `status = 'approved'`와 `deleted_at IS NULL` 정책을 지키는지 확인한다.
7. 복구 결과와 남은 위험을 보고한다.

금지:

- 승인 없이 production D1에 바로 restore하지 않는다.
- 백업 SQL 내용을 채팅이나 로그에 출력하지 않는다.
- 복구 중 임의로 `DROP`, `DELETE`, `ALTER`를 실행하지 않는다.

## 6. Recoverable Delete와 Lifecycle 정책

KOHEE LIST의 기본 삭제는 복구 가능해야 한다.

운영 원칙:

- 일반 `deleteCafe`는 row를 물리 삭제하지 않고 `deleted_at` 기반 soft delete로 처리한다.
- public cafe API는 `status = 'approved'`이고 `deleted_at IS NULL`인 카페만 반환한다.
- `resetCsv`는 기존 cafe row와 연결 데이터를 물리 삭제하지 않고 lifecycle 상태를 갱신한다.
- restore는 같은 cafe row/id를 되살리는 방식으로 유지한다.
- purge/hard delete는 기본 기능이 아니며 별도 위험 작업으로 분리한다.

purge/archive를 별도 승인할 때 필요한 조건:

- production D1 full backup
- dry-run
- 대상 목록 검토
- confirm phrase
- admin-only 권한
- audit log
- favorites/submissions 연결 영향 확인

## 7. Repo Safety Check

`npm run verify:release`는 repo 안전 체크를 포함한다.

체크 목적:

- 커밋 대상에 D1 backup, DB dump, SQLite 파일이 섞이는 것을 막는다.
- `schema.sql`과 `migrations/**/*.sql`은 허용한다.
- repo 밖 백업은 검사 대상이 아니다.

수동 실행:

```powershell
npm run check:repo-safety
```

체크가 실패하면 백업 또는 dump 파일을 repo 밖으로 옮긴 뒤 다시 실행한다.
