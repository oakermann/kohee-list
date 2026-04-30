# KOHEE LIST CSP Inline Cleanup Plan

이 문서는 Pages CSP에서 `'unsafe-inline'`을 제거하기 전에 남은 inline blocker를 정리한다.

## Current Blockers

현재 Pages `_headers`의 CSP는 아래 이유로 `'unsafe-inline'`을 유지한다.

### Inline style blocks

각 HTML은 자체 `<style>` 블록을 포함한다.

- `index.html`
- `admin.html`
- `mypage.html`
- `.pages-deploy/*.html` 동기화본

이 블록들이 남아 있는 동안 `style-src 'unsafe-inline'` 제거는 UI를 깨뜨릴 수 있다.

정리 완료:

- `login.html` / `.pages-deploy/login.html`: `assets/login.css`로 이동
- `submit.html` / `.pages-deploy/submit.html`: `assets/submit.css`로 이동

### Inline style attributes

현재 inline `style=` 속성이 남아 있다.

- `index.html`: notice 표시와 일부 first viewport helper style
- `admin.html`: section spacing, divider, count/message spacing
- `mypage.html`: modal heading style
- `.pages-deploy/*.html` 동기화본

이 속성들이 남아 있는 동안 `style-src 'unsafe-inline'` 제거는 레이아웃을 깨뜨릴 수 있다.

### Inline event handlers

`mypage.html`의 modal overlay `onclick` handler는 JS listener로 이동했다.

현재 known inline event handler blocker:

- 없음

단, 다음 단계 전 root와 `.pages-deploy` 전체에서 `onclick=`, `onload=`, `onerror=`, `onchange=`, `onsubmit=`을 다시 검색한다.

## Cleanup Order

권장 순서:

1. HTML별 `<style>` 블록을 각 페이지 CSS 파일 또는 기존 asset CSS 구조로 분리한다.
2. inline `style=` 속성을 semantic class로 바꾼다.
3. root와 `.pages-deploy` 동기화를 확인한다.
4. static review로 inline event handler가 없는지 재확인한다.
5. CSP에서 `script-src 'unsafe-inline'` 제거를 먼저 검토한다.
6. 그 다음 `style-src 'unsafe-inline'` 제거를 검토한다.

## Verification Before Tightening CSP

CSP를 조이기 전에 확인할 것:

- `npm run check:deploy-sync`
- `npm run test:unit`
- `powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1`
- `npm run verify:release`
- `npm run format:check`
- `git diff --check`
- root와 `.pages-deploy` HTML에서 inline handler 검색
- 주요 Pages 화면 수동 확인:
  - `/`
  - `/admin.html`
  - `/login.html`
  - `/submit.html`
  - `/mypage.html`

## Do Not Do Yet

- 현재 작업에서 Pages CSP를 조이지 않는다.
- inline style 정리 전 `style-src 'unsafe-inline'`을 제거하지 않는다.
- 화면 구조나 UI 문구를 재설계하지 않는다.
