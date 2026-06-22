# PR 자동 머지 점검 결과 (Auto-Merge Audit)

조사일: 2026-06-22
대상 저장소: kohee-list
조사 범위: `.github/workflows/`, `package.json`, 전체 스크립트(`scripts/`), 설정 파일 일체

## 결론

**이 저장소에는 PR 자동 머지(auto-merge) 조건이나 로직이 존재하지 않습니다.**
모든 PR은 사람이 직접(수동으로) 머지해야 합니다. 자동 머지는 거버넌스 규칙으로
명시적으로 금지되어 있으며, CI 감사 스크립트가 이를 강제합니다.

## 점검 항목별 결과

### 1. GitHub Actions 워크플로 (`.github/workflows/`)

| 파일                        | 트리거                         | 머지 로직          |
| --------------------------- | ------------------------------ | ------------------ |
| `deploy-manual.yml`         | `workflow_dispatch` 수동 배포  | 없음               |
| `deploy.yml`                | `main` push 시 Cloudflare 배포 | 없음               |
| `kohee-scheduled-smoke.yml` | cron 스케줄 스모크 테스트      | 없음               |
| `pr-validate.yml`           | `pull_request`                 | 없음 (검증만 수행) |
| `validate.yml`              | push/PR 검증                   | 없음               |

- `pr-validate.yml`(1–42행)은 PR에서 단위 테스트(`npm run test:unit`),
  KOHEE 감사(`npm run audit:kohee`), `git diff --check`만 실행하고 종료합니다.
  권한도 `contents: read`, `pull-requests: read`로 읽기 전용입니다(6–8행).
  `gh pr merge`, `pull-request-merge`, `enable_auto_merge` 등의 머지 호출이
  전혀 없습니다.

### 2. 설정 파일 — 자동 머지 도구 없음

다음 파일이 존재하지 않음을 확인:

- `.mergify.yml` 없음
- `renovate.json` / `.renovaterc` 없음
- `dependabot.yml` / `.github/dependabot.yml` 없음
- Dependabot `@dependabot merge` 지시문 없음

### 3. 스크립트 / `package.json`

`scripts/` 디렉터리 전체와 `package.json`을 검토한 결과:

- `gh pr merge` 호출 없음
- GitHub API를 통한 머지 호출 없음
- 브랜치 삭제(`git branch -D`, `--delete-branch`) 없음

### 4. 감사 스크립트가 자동 머지를 명시적으로 금지

`scripts/audit-kohee.mjs`(415–450행)는 `.github/workflows/`, `scripts/`,
`package.json` 내용을 스캔하여 금지 패턴이 발견되면 빌드를 **실패**시킵니다.
auto-merge 관련 탐지 정규식(421–423행):

```
/\b(auto[-_\s]?merge|enablePullRequestAutoMerge|enable_auto_merge|gh\s+pr\s+merge[^\n\r]*--auto)\b/i
```

현재 이 감사는 통과 상태이며, 다음 메시지를 출력합니다(449행):

> "No prohibited unattended worker/auto-merge/branch-delete/issue-close/gate-bypass automation detected"

### 5. 거버넌스 규칙

- `AGENTS.md`(65–66행): "Do not add unattended worker, auto-merge, branch
  deletion, or issue-close features in this repository."
- `docs/KOHEE_ACTIVE_QUEUE.md`(7–11행): 동일 취지의 규칙 명시.

### 6. GitHub 네이티브 Auto-Merge 설정 주의사항

GitHub 저장소 설정의 "Allow auto-merge" 옵션은 파일이 아닌 저장소 설정
(Settings → General → Pull Requests)에 저장되므로 코드에는 나타나지 않습니다.
이 항목은 GitHub 웹 UI 또는 `gh api repos/:owner/:repo`로만 확인 가능하며,
본 조사(파일 기반)로는 확정할 수 없습니다. 다만 워크플로/스크립트 어디에서도
`--auto` 플래그나 auto-merge 활성화 호출이 없어, 자동 머지를 트리거하는
코드 경로는 존재하지 않습니다.

## 요약

파일 기반 자동 머지 로직: **없음**. 거버넌스 규칙과 `audit-kohee.mjs` 감사가
자동 머지 도입을 적극적으로 차단하고 있습니다. (네이티브 GitHub 저장소 설정만
별도 UI/API 확인 권장.)
