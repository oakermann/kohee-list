# KOHEE LIST — 작업 규칙

먼저 `docs/KOHEE_MASTER_CONTEXT.md` 를 읽는다.

- 공개 조건(`approved AND deleted_at IS NULL`)과 공개 응답 칸을 바꾸지 않는다 — `scripts/test-api.mjs` 가 지킨다.
- 회원·세션·IP·쿠키 추적을 다시 들이지 않는다. 이용자 식별은 브라우저 표(`client_id`)뿐.
- DB 구조는 `migrations/` 로만, 운영 적용은 백업 뒤 손으로(`d1-migrate.yml`). 자동 적용 금지.
- 백업·DB 덤프·비밀값을 커밋하지 않는다(`npm run check:repo-safety`).
- 배포는 main 합침 = 자동(`deploy.yml`). 로컬에서 운영 배포는 오너가 시킬 때만.
- 검증: `npm test`, `npm run format:check`, `git diff --check`. 화면을 바꿨으면 `wrangler pages dev` 로 띄워 눌러 본다.
