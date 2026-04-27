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

## 2. 기본 작업 절차

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

## 3. Release 검증

로컬과 GitHub Actions에서 공통으로 아래 명령을 사용한다.

```powershell
npm run verify:release
```

`verify:release`는 다음을 순서대로 실행한다.

1. `npm run check:deploy-sync`
2. `npm run test:unit`
3. `powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1`

실패하면 어느 단계에서 실패했는지 출력하고 non-zero exit code로 종료한다.

## 4. GitHub Actions 배포 원칙

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

## 5. 변경 영역 감지 기준

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

## 6. GitHub Secrets

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

## 7. 로컬 Cloudflare 배포 예외 규칙

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

## 8. D1 / Migration 안전 규칙

D1 schema 또는 migration 변경은 일반 프론트 수정처럼 자동 배포하지 않는다.

원칙:

- 원격 D1에 migration을 자동 적용하지 않는다.
- migration 계획, 백업, 적용 방법, rollback 가능성을 먼저 보고한다.
- 사용자가 명시적으로 승인한 경우에만 원격 D1 적용을 검토한다.
- D1 변경이 감지되면 GitHub Actions 자동 배포를 막는다.
- 기존 migration은 이미 적용된 DB에 다시 실행하지 않는다.

## 9. Force Push 안전 규칙

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

## 10. `.pages-deploy` 동기화 원칙

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

## 11. Cache Version 주의

현재 HTML과 JS import에는 `?v=20260426-1` 같은 하드코딩 asset version이 남아 있다.

이 방식은 수동 변경 누락 위험이 있다.

향후 개선 후보:

- sync/build 단계에서 timestamp 또는 파일 hash 기반으로 asset query version을 자동 갱신한다.
- 수동으로 `?v=...`를 올리는 방식을 제거한다.

이번 문서화 작업에서는 앱 런타임 구조를 바꾸지 않기 위해 캐시 버전 자동화는 구현하지 않는다.

## 12. Wrangler 설정 메모

Worker 설정은 `wrangler.toml`, Pages 설정은 `wrangler.pages.toml`에 분리되어 있다.

Pages 배포 기준은 `.pages-deploy`다.

Wrangler Pages 배포 시 경고가 나타나면 Pages 설정과 Worker 설정을 무리하게 합치지 말고, 먼저 설정 영향 범위를 확인한다.

## 13. Branch Protection 체크리스트

GitHub repository Settings에서 수동으로 확인할 항목:

- `main` 브랜치 보호
- force push 금지
- status check 통과 요구
- `Validate` workflow 통과 요구
- 필요 시 `Deploy` workflow 확인
- PR 기반 운영 전환 시 required review 검토
- GitHub Environments `production` 승인 옵션 검토

Codex는 GitHub 설정을 임의로 변경하지 않는다.

## 14. Smoke Check

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

## 15. 완료 보고 형식

Codex는 작업 완료 시 아래 항목을 보고한다.

1. 변경 요약
2. 변경한 파일
3. 추가/수정한 package scripts
4. 추가/수정한 scripts
5. 추가/수정한 GitHub Actions workflow
6. GitHub Secrets 필요 항목
7. 문서화한 운영 규칙
8. 변경 영역 감지 기준
9. D1/migration 안전 처리 방식
10. force push 안전 처리 방식
11. 실행한 검증 명령
12. 검증 결과
13. 커밋 해시
14. origin/main 해시
15. push 성공 여부
16. GitHub Actions 실행 여부
17. GitHub Actions run URL 또는 확인 방법
18. Pages 배포 여부와 사유
19. Worker 배포 여부와 사유
20. Worker health 확인 결과 또는 미확인 사유
21. 테스트하지 못한 항목
22. 추가 확인 필요한 부분
23. 위험/주의 사항
