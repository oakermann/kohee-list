-- 0006: cafes.naver_url - 카페별 네이버 지도 place URL 저장.
-- 기존 지도 버튼은 "카페명+도시" 키워드 검색 링크를 생성하는데, 동명 지점이 여러 곳이면
-- 엉뚱한 지점이 먼저 잡힌다(예: 수평적관계 - 대구 3개 지점). 정확한 place URL을 저장해
-- 프론트가 이를 우선 사용하고, 비어 있으면 기존 키워드 검색으로 폴백한다.
ALTER TABLE cafes ADD COLUMN naver_url TEXT DEFAULT '';
