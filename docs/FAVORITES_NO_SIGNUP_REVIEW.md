# 회원가입 없는 즐겨찾기 검토 (Favorites Without Signup)

Last updated: 2026-07-21

KOHEE LIST is a product repository. OAP is maintained separately.

이 문서는 오너 요청("회원가입 없이 즐겨찾기를 개인별로 보관하는 방법을 검토, 회원가입은
법적 부담 때문에 제거하는 방향")에 대한 검토 문서다. **구현 변경은 포함하지 않는다.**
구현 착수는 별도의 명시적 오너 승인 후 진행한다.

## 1. 현재 구현

- 즐겨찾기는 로그인 필수: `server/favorites.js`의 `/favorites`(목록), `/favorite`(토글)
  모두 `requireAuth` 세션을 요구하고, D1 `favorites` 테이블에 `user_id` 기준으로 저장한다.
- 목록 조회는 `cafes`와 JOIN하며 `status = 'approved' AND deleted_at IS NULL`만 노출
  (PUBLIC_EXPOSURE 불변식).
- 계정은 `username + password_hash + role`만 저장한다(이메일 없음). `server/auth.js`.
- 프론트: `assets/index.js`가 `favoriteIds` Set을 유지하고, 비로그인 상태에서 ☆를 누르면
  로그인 페이지 이동을 확인(confirm)한다. 탭 간 동기화 신호로 localStorage
  `kohee-favorites-sync` 키를 이미 사용 중이다. `assets/mypage.js`가 목록 화면을 담당한다.

## 2. 법적 관점 (참고 정리이며 법률 자문 아님)

- 현재 구조는 username/password 계정 데이터를 서버(D1)에 저장하므로 개인정보보호법상
  개인정보 처리로 해석될 여지가 있고, 그 경우 처리방침·안전조치·파기·유출 통지 등
  운영 의무가 따라온다.
- 즐겨찾기를 **기기 로컬 저장(localStorage)** 으로 전환하고 일반 사용자 계정을 없애면
  서버에 개인 데이터를 저장하지 않게 되어 위 의무 대부분이 발생 원인부터 사라진다.
  로컬 저장 사용 사실을 안내 문구로 고지하는 정도가 남는다.
- 반대로 "익명 디바이스 ID를 서버에 저장"하는 절충안은 기기 식별자가 개인정보로
  해석될 수 있어 법적 이득이 크게 희석된다.

## 3. 옵션 비교

| 옵션     | 방식                          | 장점                                    | 단점                                              |
| -------- | ----------------------------- | --------------------------------------- | ------------------------------------------------- |
| A (권장) | localStorage 단독             | 구현 최소, 서버 저장 0, 오프라인 동작   | 기기 간 동기화 없음, 브라우저 데이터 삭제 시 소실 |
| B        | A + 내보내기/가져오기 코드    | 기기 이전 수단 제공, 서버 여전히 무접촉 | UI 한 개 추가 필요                                |
| C        | 익명 디바이스 ID + D1         | 동기화 가능                             | 법적 이득 희석, 서버/D1 유지 비용, 비권장         |
| D        | 즐겨찾기 목록 URL 인코딩 공유 | 공유/백업 겸용, 서버 무접촉             | 긴 URL, 보관 수단으로는 불완전                    |

주의(옵션 A/B 공통): iOS Safari의 트래킹 방지(ITP)는 7일간 사이트 미방문 시 스크립트
기록 localStorage를 삭제할 수 있다. 재방문 사용자에게는 문제가 없지만, 장기 미방문
사용자의 즐겨찾기는 사라질 수 있다. B(내보내기 코드)가 이 한계의 보완책이다.

## 4. 권장안: A 기본 + B 후속

구현 스케치 (착수는 별도 승인 후):

- localStorage 키 `kohee-favorites`에 카페 id 배열(JSON, 버전 필드 포함)을 저장한다.
- `assets/index.js`: `loadFavorites`를 localStorage 읽기로, `toggleFavorite`를 로컬 Set
  갱신+저장으로 교체하고 로그인 유도 confirm을 제거한다. 기존 `kohee-favorites-sync`
  탭 동기화 로직은 그대로 재사용한다.
- `assets/mypage.js`: 로컬 id 목록을 공개 `/data` 응답과 매칭해 표시한다. 공개 데이터
  자체가 approved-only이므로 PUBLIC_EXPOSURE 불변식이 클라이언트에서도 자연 유지되고,
  매칭 실패한 id(비공개 전환/삭제된 카페)는 표시하지 않고 정리한다.
- 서버 `/favorite`, `/favorites` 호출은 사라진다(엔드포인트 제거는 5절의 단계에서).

## 5. 회원가입 제거 전환 단계 (전부 hard no-change 영역 → 명시 승인 필수)

`server/**`, auth/session, D1은 계약상 hard no-change 영역이고 D1 작업은 HIGH/HOLD가
기본이므로, 아래는 순서 제안일 뿐 각 단계마다 오너 승인이 필요하다.

1. 프론트를 로컬 즐겨찾기로 전환(4절). 이 시점부터 서버 즐겨찾기는 읽기 전용 유산.
2. 전환 기간: 로그인 상태로 접속한 기존 사용자에 한해 서버 즐겨찾기를 localStorage로
   1회 복사(안내 문구 포함).
3. 신규 일반 가입 차단 → 로그인/마이페이지 UI에서 일반 계정 진입점 제거.
4. 일반 사용자용 auth/favorites 엔드포인트 제거.
5. 백업 후 `users`(일반 사용자)·`favorites` 데이터 파기 — 파기 완료 시점이 법적
   리스크가 실제로 소멸하는 시점이다. D1 migration runbook 절차를 따른다.

## 6. 남은 결정 (오너)

- **admin 계정은 유지 필요**: 관리자 화면(`admin.html`)과 카페 CRUD는 계정 기반이어야
  한다. contract의 `authModelTarget: admin_user`와 정합하게 "일반 사용자 가입만 제거,
  admin 계정 유지"로 갈지 확정 필요.
- 카페 제보(`submit.html`)·에러 제보 흐름이 로그인을 요구하는 구간이 있는지 확인하고,
  익명 제보로 전환할지 결정 필요.
- 옵션 B(내보내기 코드)를 같은 단계에서 넣을지, 후속으로 미룰지.
