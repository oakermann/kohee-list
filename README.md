# KOHEE LIST

카페 큐레이션 사이트 — https://kohee.pages.dev

정본: [docs/KOHEE_MASTER_CONTEXT.md](docs/KOHEE_MASTER_CONTEXT.md) (데이터·사람·운영 콘솔·배포·로컬)

```
site/            화면(HTML·CSS·JS, _headers)
functions/api/   Pages 함수 → server/app.js 로 넘김
server/          API: app(입구)·routes·admin(잠금)·cafes·errorReports·csv·shared
migrations/      D1 마이그레이션(손으로만 적용)  ·  schema.sql 전체 스키마
scripts/         test-api(진짜 SQL)·test-site(화면 정적)·smoke-check(실사이트)·
                 check-repo-safety·check-cafe-candidates(네이버 대조 도구)
```

`npm test` · `npm run format:check` · `npm run smoke:check`
