# KOHEE LIST Codex Workflow

이 문서는 KOHEE LIST에서 Codex가 코드를 수정하고 검증하고 배포 흐름을 넘기는 기본 절차를 정리한다.

## 1. Codex 역할

Codex의 기본 역할은 코드 수정, 로컬 검증, 커밋, GitHub push까지다.

Codex는 기본적으로 로컬에서 Cloudflare Pages 또는 Worker 배포를 직접 실행하지 않는다. `main` 브랜치 push 이후 Cloudflare 배포는 GitHub Actions가 처리한다.

Codex가 임의로 하지 않는 작업:

- 앱 기능 추가
- UI/UX 변경
- role 또는 category 추가
- 인증/권한 구조 변경
- D1 migration 원격 적용
- main 브랜치 force push
- Cloudflare token 또는 account id 하드코딩

KOHEE LIST 2의 고정 규칙:

- role은 `admin`, `manager`, `user`만 사용한다.
- `super_admin`은 만들지 않는다.
- 기본 category는 `espresso`, `drip`, `decaf`, `instagram`, `dessert`만 사용한다.
- 새우톤은 쓰지 않는다.
- 기능 추가는 사용자가 명시한 경우에만 한다.

## 2. 작업 종류 분류표

사용자의 거친 요구는 먼저 아래 작업 종류 중 하나로 분류한다. 한 프롬프트에는 한 종류의 작업만 담는다.

| 종류 | 예시 | 처리 원칙 |
| --- | --- | --- |
| A. 작은 수정 | 문구 수정, 단일 버그 수정, 작은 UI 보정, 작은 검증 로직 수정 | 바로 Codex 프롬프트 작성 가능. 변경 파일을 최소화한다. `npm run verify:release`를 실행한다. |
| B. 안정화 작업 | XSS 방지, URL 검증, CSV 검증, public/admin 데이터 분리, soft delete, 보안 헤더, 테스트 보강 | 기능 추가와 섞지 않는다. 변경 목적을 보안/안정성으로 제한한다. 검증 기준을 명확히 둔다. |
| C. 리팩토링 / 코드 정리 | 포맷 정리, 파일 구조 정리, 중복 제거, 함수 분리, naming 정리 | 기능 변경과 섞지 않는다. format-only 또는 refactor-only commit으로 분리한다. 대량 diff 가능성을 보고한다. |
| D. 기능 추가 | 제보 기능, 픽 뱃지, 관리자 기능 추가, 사용자 기능 추가 | 사용자가 명시한 경우에만 진행한다. 안정화 작업과 섞지 않는다. public/internal 데이터 노출 위험을 검토한다. |
| E. DB / migration 작업 | D1 schema 변경, `status`/`deleted_at` 추가, `sessions`/`users` 변경, migration 적용 | 바로 구현하지 않는다. 먼저 설계, 백업, 복구, migration 계획을 작성한다. 원격 D1 자동 적용은 금지한다. 사용자 승인 후 진행한다. |
| F. 배포 / 운영 작업 | GitHub Actions, Cloudflare Pages/Worker 배포, rollback, branch protection, smoke check | 앱 기능과 섞지 않는다. 로컬 Cloudflare 배포는 금지한다. GitHub Actions 중심으로 처리한다. |

## 3. 프롬프트 흔들림 방지 원칙

- 한 프롬프트에는 한 종류의 작업만 담는다.
- 기능 추가와 리팩토링을 섞지 않는다.
- 보안 수정과 UI 개선을 섞지 않는다.
- DB migration과 프론트 수정은 분리한다.
- “완벽하게”라는 표현은 구체 항목으로 쪼갠다.
- 백로그 아이디어를 즉시 구현 지시처럼 쓰지 않는다.
- 확정 규칙과 제안을 분리한다.
- Codex가 임의로 범위를 넓히지 못하게 작업 범위를 명시한다.
- 사용자가 말한 최신 지시가 항상 우선이다.
- 애매하면 Codex가 판단하지 말고 보고한다.

## 4. Codex 프롬프트 기본 골격

Codex에게 작업을 넘길 때는 아래 골격을 기본값으로 사용한다.

```text
[목표]
이번 작업의 목적

[작업 종류]
작은 수정 / 안정화 / 리팩토링 / 기능 추가 / DB 작업 / 운영 작업 중 하나

[작업 범위]
수정 가능한 파일과 수정 금지 파일

[허용되는 변경]
이번 작업에서 허용되는 변경

[금지되는 변경]
이번 작업에서 절대 하지 말 것

[구현 요구사항]
구체 작업 단계

[검증 기준]
실행할 명령과 통과 기준

[Git 작업]
add/commit/push 기준

[Cloudflare 배포]
기본적으로 GitHub Actions가 처리

[보고 형식]
변경 요약, 파일, 테스트, 미확인 항목, 위험사항
```

## 5. KOHEE LIST 전용 금지사항

Codex는 아래 항목을 임의로 하지 않는다.

- `super_admin` 추가
- role 추가
- category 추가
- 새우톤 추가
- 공개 API에 내부 메모, 선정 근거, 제보자 정보, 관리자 정보 노출
- 후보 카페 자동 공개
- D1 migration 자동 적용
- hard delete 신규 추가
- Cloudflare token 하드코딩
- 로컬 Cloudflare 배포 임의 실행
- 전체 format을 기능 작업과 섞기
- 원격 `main` force push

## 6. 사용자 요구 해석 규칙

ChatGPT가 사용자 요구를 Codex 작업으로 바꿀 때는 구현 지시로 바로 바꾸지 말고, 먼저 작업 종류와 범위를 확정한다.

- “완전 안정화해라”는 안정화 항목을 목록화하고 단계별로 나눈다.
- “코드 정리해라”는 format-only, refactor-only, 구조 변경을 분리한다.
- “보안 봐라”는 XSS, URL, auth, API, headers, data exposure로 나눈다.
- “기능 추가해라”는 데이터 구조 영향, API 영향, UI 영향, 권한 영향을 확인한 뒤 진행한다.
- “일단 다 해라”는 바로 구현하지 말고 phase로 나눈다.

## 7. 현재 안정화 우선순위 백로그

아래 목록은 현재 우선순위 기록이다. 이 목록은 즉시 구현 지시가 아니며, 별도 프롬프트와 승인 없이 실행하지 않는다.

1. Codex 유통망 실전 검증
2. 코드 포맷/구조 정리
3. 공개 프론트 렌더링 보안 마무리
4. soft delete + approved 상태 설계
5. CSV 백업/검증/적용 안정화
6. public/admin API 정리
7. security headers / cache policy 점검
8. 테스트 확대
9. D1 migration 체계 정리
10. 기능 추가

## 8. 기본 작업 절차

1. 사용자 요청 범위를 확인한다.
2. 필요한 파일만 수정한다.
3. 프론트 변경 시 root와 `.pages-deploy`를 동기화한다.
4. `npm run verify:release`를 실행한다.
5. 필요한 경우 수정 파일만 Prettier로 정리한다.
6. `git status --short`를 확인한다.
7. 변경 파일만 `git add` 한다.
8. 작업 성격에 맞는 커밋 메시지로 커밋한다.
9. `git push`를 실행한다.
10. Cloudflare 배포는 GitHub Actions가 처리한다.
11. 가능하면 GitHub Actions 결과를 확인한다.
12. 완료 보고를 남긴다.

기본적으로 전체 `npm run format`은 대량 diff 위험이 있으므로 피한다. 필요한 경우 수정 파일 중심으로 포맷한다.

## 9. Release 검증

로컬과 GitHub Actions에서 공통으로 아래 명령을 사용한다.

```powershell
npm run verify:release
```

`verify:release`는 다음을 순서대로 실행한다.

1. `npm run check:deploy-sync`
2. `npm run test:unit`
3. `powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1`

실패하면 어느 단계에서 실패했는지 출력하고 non-zero exit code로 종료한다.

## 10. GitHub Actions 배포 원칙

`validate.yml`은 검증 전용이다.

`deploy.yml`은 `main` 브랜치 push 또는 수동 실행 시 다음 순서로 동작한다.

1. checkout
2. Node 설치
3. 의존성 설치
4. `npm run verify:release`
5. 변경 영역 감지
6. D1 변경 여부 확인
7. Pages 배포 필요 시 Pages 배포
8. Worker 배포 필요 시 Worker 배포
9. 배포한 대상 smoke check
10. GitHub Actions summary 출력

자동 배포 조건:

- 프론트 변경이면 Pages 배포 대상이다.
- Worker/server 변경이면 Worker 배포 대상이다.
- 문서만 변경된 경우 Cloudflare 배포하지 않는다.
- workflow/tooling만 변경된 경우 기본적으로 Cloudflare 배포하지 않는다.
- D1/schema/migration 변경이 감지되면 자동 배포를 막고 수동 확인 대상으로 둔다.

GitHub JavaScript Action 런타임 경고 대응:

- `actions/checkout`은 `v6`을 사용한다.
- `actions/setup-node`는 `v6`을 사용한다.
- 두 action 모두 Node 24 런타임 기반 stable major로 올렸다.
- 프로젝트 검증에 사용하는 Node.js 버전은 기존처럼 `node-version: "20"`을 유지한다.
- 즉, GitHub Action 자체 런타임 경고와 프로젝트 실행 Node 버전은 분리해서 관리한다.

## 11. 변경 영역 감지 기준

`scripts/detect-changed-areas.mjs`가 변경 파일을 기준으로 아래 값을 계산한다.

- `frontendChanged`
- `workerChanged`
- `d1Changed`
- `docsOnlyChanged`
- `workflowChanged`
- `toolingChanged`
- `shouldDeployPages`
- `shouldDeployWorker`
- `shouldBlockAutoDeployDueToD1`

프론트 변경 기준:

- `index.html`
- `admin.html`
- `login.html`
- `submit.html`
- `mypage.html`
- `assets/**`
- `.pages-deploy/**`

Worker 변경 기준:

- `worker.js`
- `server/**`
- `wrangler.toml`

D1 변경 기준:

- `migrations/**`
- `schema/**`
- `d1/**`
- `schema.sql`
- `*.sql`

## 12. GitHub Secrets

GitHub Actions 배포에는 아래 Secrets가 필요하다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

저장 위치:

GitHub repository Settings -> Secrets and variables -> Actions

원칙:

- 코드에 저장하지 않는다.
- 로그에 출력하지 않는다.
- Cloudflare API Token은 필요한 권한으로 제한한다.
- D1 migration 자동 적용용 토큰으로 쓰지 않는다.

Secrets 확인 원칙:

- Pages 또는 Worker 배포가 필요한 경우에만 Secrets를 확인한다.
- docs/tooling/workflow만 변경된 경우 Secrets가 없어도 workflow가 실패하지 않는 것이 정상이다.
- D1 변경이 감지된 경우 Secrets 확인보다 자동 배포 차단이 우선이다.
- Summary에는 Secrets 값이 아니라 필요 여부와 확인 결과만 표시한다.

## 13. 로컬 Cloudflare 배포 예외 규칙

Codex는 기본적으로 로컬 Cloudflare 배포를 실행하지 않는다.

예외적으로 사용자가 명시적으로 로컬 배포를 지시한 경우에만 실행한다.

Pages 예외 배포:

```powershell
npx.cmd wrangler pages deploy .pages-deploy --project-name kohee --branch main
```

Worker 예외 배포:

```powershell
npx.cmd wrangler deploy
```

Worker health 확인:

```powershell
curl.exe -s https://kohee-list.gabefinder.workers.dev/health
```

## 14. D1 / Migration 안전 규칙

D1 schema 또는 migration 변경은 일반 프론트 수정처럼 자동 배포하지 않는다.

원칙:

- 원격 D1에 migration을 자동 적용하지 않는다.
- migration 계획, 백업, 적용 방법, rollback 가능성을 먼저 보고한다.
- 사용자가 명시적으로 승인한 경우에만 원격 D1 적용을 검토한다.
- D1 변경이 감지되면 GitHub Actions 자동 배포를 막는다.
- 기존 migration은 이미 적용된 DB에 다시 실행하지 않는다.

## 15. Force Push 안전 규칙

`main` 브랜치 force push는 기본 금지다.

Codex는 push가 거부되어도 임의로 merge, rebase, force push를 하지 않는다. 먼저 원격과 로컬 차이를 보고하고 멈춘다.

확인 명령:

```powershell
git fetch origin main
git log --oneline main..origin/main
git log --oneline origin/main..main
```

사용자가 명시적으로 “원격 main을 현재 로컬로 덮어써라”라고 지시한 경우에만 force push를 검토한다.

그래도 `--force`는 금지하고, 반드시 `--force-with-lease`만 사용한다.

권장 백업:

```powershell
git branch backup/main-before-force origin/main
git push origin backup/main-before-force
git push --force-with-lease origin main
```

## 16. `.pages-deploy` 동기화 원칙

현재 KOHEE LIST는 root 프론트 소스와 `.pages-deploy` 배포 소스가 함께 존재한다.

프론트 파일 변경 시 두 위치를 동기화해야 한다.

필수 원칙:

- `npm run check:deploy-sync` 실패 시 커밋하지 않는다.
- `npm run check:deploy-sync` 실패 시 배포하지 않는다.
- GitHub Actions에서도 deploy sync 실패 시 배포하지 않는다.

장기 개선 후보:

- root를 source of truth로 두고 `.pages-deploy`는 build/sync 결과물로 전환한다.
- Codex가 양쪽을 직접 수정하는 방식을 줄인다.
- `sync:pages` 또는 `build:pages` 명령으로 배포 소스를 생성한다.

## 17. Cache Version 주의

현재 HTML과 JS import에는 `?v=20260426-1` 같은 하드코딩 asset version이 남아 있다.

이 방식은 수동 변경 누락 위험이 있다.

향후 개선 후보:

- sync/build 단계에서 timestamp 또는 파일 hash 기반으로 asset query version을 자동 갱신한다.
- 수동으로 `?v=...`를 올리는 방식을 제거한다.

이번 문서화 작업에서는 앱 런타임 구조를 바꾸지 않기 위해 캐시 버전 자동화는 구현하지 않는다.

## 18. Wrangler 설정 메모

Worker 설정은 `wrangler.toml`, Pages 설정은 `wrangler.pages.toml`에 분리되어 있다.

Pages 배포 기준은 `.pages-deploy`다.

Wrangler Pages 배포 시 경고가 나타나면 Pages 설정과 Worker 설정을 무리하게 합치지 말고, 먼저 설정 영향 범위를 확인한다.

## 19. Branch Protection 체크리스트

GitHub repository Settings에서 수동으로 확인할 항목:

- `main` 브랜치 보호
- force push 금지
- status check 통과 요구
- `Validate` workflow 통과 요구
- 필요 시 `Deploy` workflow 확인
- PR 기반 운영 전환 시 required review 검토
- GitHub Environments `production` 승인 옵션 검토

Codex는 GitHub 설정을 임의로 변경하지 않는다.

## 20. Smoke Check

가벼운 배포 확인 명령:

```powershell
npm run smoke:check
```

개별 확인:

```powershell
node scripts/smoke-check.mjs --pages
node scripts/smoke-check.mjs --worker
```

추후 브라우저 기반 smoke test 후보:

- 검색 입력
- 카페 카드 클릭
- 모달 열림
- 네이버 지도 버튼
- 공유 버튼
- 관리자 링크 공개 노출 여부
- 로그인/관리자 플로우

GitHub Actions에서의 smoke check 원칙:

- Pages 배포가 실제로 수행된 경우에만 Pages URL을 확인한다.
- Worker 배포가 실제로 수행된 경우에만 Worker `/health`를 확인한다.
- 아무 배포도 없으면 smoke check는 skip된다.
- Worker를 배포했는데 `/health`가 실패하면 workflow 실패로 처리한다.

## 21. GitHub Actions Summary 확인 항목

`Deploy` workflow summary에서 아래 항목을 확인한다.

- Commit SHA
- Branch
- Event
- frontendChanged
- workerChanged
- d1Changed
- docsOnlyChanged
- workflowChanged
- toolingChanged
- Pages deploy 여부
- Pages skip reason
- Worker deploy 여부
- Worker skip reason
- D1 auto-deploy blocked 여부
- Secrets required 여부
- Secrets check 결과
- Smoke check 계획 또는 skip 사유

## 22. 완료 보고 형식

Codex는 작업 완료 시 아래 항목을 보고한다.

1. 변경 요약
2. 작업 전 preflight 결과
3. 변경한 파일
4. 추가/수정한 문서 내용
5. 정리한 작업 분류표
6. 추가한 프롬프트 흔들림 방지 원칙
7. KOHEE LIST 전용 금지사항 정리 결과
8. 현재 안정화 백로그 정리 결과
9. 실행한 검증 명령
10. 검증 결과
11. 변경 영역 감지 결과
12. 커밋 해시
13. origin/main 해시
14. push 성공 여부
15. GitHub Actions 확인 방법
16. Pages/Worker 배포 skip 여부
17. 테스트하지 못한 항목
18. 추가 확인 필요한 부분
19. 위험/주의 사항
