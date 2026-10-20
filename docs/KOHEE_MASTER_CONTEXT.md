# KOHEE LIST — 시스템 정본

카페 큐레이션 사이트. 주소 하나(https://kohee.pages.dev), Cloudflare Pages 프로젝트 하나(`kohee`)가
화면(`site/`)과 API(`functions/api` → `server/`)를 함께 내고, D1(`kohee-list`)에 직접 묶인다.
워커·회원·세션·IP 수집은 없다(2026-10-21, 마이그레이션 0011).

## 데이터

| 표              | 무엇                                      |
| --------------- | ----------------------------------------- |
| `cafes`         | 공개 카페·후보·사용자 제보가 한 표에 산다 |
| `error_reports` | 오류 제보와 운영자 답변(같은 줄)          |
| `settings`      | 메인 공지                                 |

카페 상태:

- **공개** = `status = 'approved' AND deleted_at IS NULL` — 사이트(`/api/data`)에 보이는 유일한 조건
- **후보** = `status = 'candidate'` — 어드민 등록·CSV·사용자 제보(`client_id` 있음)
- **내림** = `deleted_at` 있음 — 버린 제보·내린 카페. 되살리면 원래 상태로, 완전 삭제는 내린 것만
- 공개하려면 좌표(lat/lng)가 있어야 한다 — 좌표 0 은 '내 주변'에서 조용히 빠진다

공개 응답에는 운영 메모·제보자 표·제보 사유·상태 칸을 내보내지 않는다(`scripts/test-api.mjs` 가 지킨다).

## 사람

- **이용자**: 로그인 없음. 찜은 브라우저(localStorage)에만. 제보·오류 제보는 브라우저가 만든 무작위
  표(`client_id`)를 붙여 보내고, 같은 브라우저의 '찜·내 제보'에서 처리 결과·답변을 본다.
  도배는 사이트 전체 하루 상한(`SUBMIT_DAILY_CAP`)으로 막는다 — 어차피 어드민이 공개해야 보인다.
- **어드민**: 비밀번호 하나(Pages 비밀값 `ADMIN_PASSWORD`). 로그인하면 `만료.서명` 쿠키(HttpOnly·Secure·
  SameSite=Strict, 서명 열쇠 = 비밀번호). 비밀번호를 바꾸면 모든 쿠키가 무효.
  `wrangler pages secret put ADMIN_PASSWORD --project-name kohee`

## 운영 콘솔(`/admin`)

첫 화면 = 운영(칸 고르기): 새로 들어옴 [공개][버리기] · 공개 중 [내리기] · 내린 것 [되살리기][완전 삭제] ·
오류 제보 · 공지 · CSV 가져오기 · 방문자(Cloudflare Web Analytics). 카드를 누르면 수정.
좌표는 주소로 자동 채움(`/api/geocode`, Nominatim, 어드민 전용 — 초당 1회 정책).

CSV 가져오기 = 새 카페만 후보로. 주소(공백 무시)가 같은 카페는 건너뛰고, 틀린 행이 하나라도 있으면
아무것도 넣지 않는다(batch). 기존 카페를 고치는 경로는 없다.

## 배포

- PR·main: `.github/workflows/check.yml` — `npm test`, 포맷, 저장소 안전(백업·DB 파일 커밋 금지)
- main 합침: `deploy.yml` — Pages 배포 + `npm run smoke:check`(실제 사이트)
- DB 구조 변경(`migrations/`·`schema.sql`)이 섞인 push 는 배포하지 않는다: 백업
  (`wrangler d1 export kohee-list --remote`) → `d1-migrate.yml`(apply) → Deploy 수동 실행
- 화면 파일은 `Cache-Control: no-cache`(매번 확인, 안 바뀌면 304) — `?v=` 를 올리지 않는다

## 로컬

```
npx wrangler d1 execute kohee-list --local --file <백업.sql>   # 또는 --file schema.sql
npx wrangler d1 migrations apply kohee-list --local
npx wrangler pages dev site --binding ADMIN_PASSWORD=<아무거나>   # http://127.0.0.1:8788
SITE_URL=http://127.0.0.1:8788 npm run smoke:check
```
