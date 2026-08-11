-- 0010: cafes.region / cafes.memo - 카드에 표시하지 않는 백데이터 두 칸.
--
-- region: 카페가 속한 지역이나 가까운 역·동네("군자역", "서울역"). 주소도 카페명도
-- 아니어서 지금은 어디에도 저장되지 않고, 그래서 "군자역"으로 검색하면 아무것도
-- 안 나온다. 좌표(lat/lng)는 거리 계산용이라 이걸 대신하지 못한다.
--
-- memo: 운영용 내부 메모. 관리자 응답에만 실리고 공개 /data 응답에는 나가지 않는다.
--
-- 둘 다 카드에 렌더링하지 않는다. 저장만 한다.
ALTER TABLE cafes ADD COLUMN region TEXT DEFAULT '';
ALTER TABLE cafes ADD COLUMN memo TEXT DEFAULT '';
