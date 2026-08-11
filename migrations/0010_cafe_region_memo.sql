-- 0010: cafes.region / cafes.region_distance_m / cafes.memo
--       - 카드에 표시하지 않는 백데이터.
--
-- "군자역에서 466m" 같은 정보는 쓸모가 있는데 둘 곳이 없어서 소개(desc) 문장 안에
-- 문자열로 들어가 있었다. 소개는 사람이 읽는 문장이지 데이터 보관함이 아니다.
-- 제 자리를 만들어 주고 소개에서는 빼낸다.
--
-- region: 가까운 역이나 동네 이름("군자역"). 주소도 카페명도 아니어서 지금은 어디에도
-- 저장되지 않고, 그래서 "군자역"으로 검색하면 아무것도 안 나온다.
--
-- region_distance_m: region 까지의 거리(미터). 역 좌표를 갖고 있지 않으므로 카페의
-- lat/lng 로는 이 값을 다시 계산할 수 없다. 그래서 저장한다.
--
-- memo: 운영용 내부 메모. 관리자 응답에만 실리고 공개 /data 응답에는 나가지 않는다.
--
-- 셋 다 카드에 렌더링하지 않는다.
ALTER TABLE cafes ADD COLUMN region TEXT DEFAULT '';
ALTER TABLE cafes ADD COLUMN region_distance_m INTEGER DEFAULT 0;
ALTER TABLE cafes ADD COLUMN memo TEXT DEFAULT '';
