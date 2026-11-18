// Admin watch tests — the pure parts only (no wrangler, network, hub or state file).
import assert from "node:assert/strict";
import {
  FAR_KM,
  PUSH_NAMES_MAX,
  SWEEP_PER_RUN,
  buildMessage,
  distanceProblem,
  freshFindings,
  haversineKm,
  nameList,
  prunePushed,
  queueLines,
  queueNews,
  rangeProblem,
  rotate,
} from "./admin-watch.mjs";

const seoul = { lat: 37.5665, lng: 126.978 };
const busan = { lat: 35.1796, lng: 129.0756 };
const cafe = (over = {}) => ({
  id: "a",
  name: "카페",
  address: "서울 성동구 연무장길 1",
  ...seoul,
  ...over,
});

// haversine: Seoul–Busan is about 325 km; a point to itself is 0.
assert.ok(Math.abs(haversineKm(seoul, busan) - 325) < 3);
assert.equal(haversineKm(seoul, seoul), 0);

// range: lat = lng (11/18 브루잉세레모니), swapped, outside, missing.
assert.equal(rangeProblem(cafe()), "");
assert.equal(
  rangeProblem(cafe({ lat: 37.543, lng: 37.543 })),
  "위도=경도 37.5430",
);
assert.match(rangeProblem(cafe({ lat: 127.05, lng: 37.54 })), /^한국 밖/);
assert.match(rangeProblem(cafe({ lat: 40.1, lng: 127 })), /^한국 밖/);
assert.equal(rangeProblem(cafe({ lat: 0, lng: 127 })), "좌표 없음");
assert.equal(rangeProblem(cafe({ lat: 0, lng: 0 })), "좌표 없음");

// distance: flagged only past FAR_KM and only when the hit names the address's district.
const near = {
  lat: seoul.lat + 0.02,
  lng: seoul.lng,
  label: "연무장길, 성동구, 서울",
}; // ~2.2 km
const far = {
  lat: seoul.lat + 0.05,
  lng: seoul.lng,
  label: "연무장길, 성동구, 서울",
}; // ~5.6 km
assert.ok(
  haversineKm(seoul, near) < FAR_KM && haversineKm(seoul, far) > FAR_KM,
);
assert.equal(distanceProblem(cafe(), near), "");
assert.equal(distanceProblem(cafe(), far), "주소와 5.6km");
assert.equal(distanceProblem(cafe(), { ...far, label: "해운대구, 부산" }), "");
assert.equal(distanceProblem(cafe(), null), "");

// rotation: id order, wraps, every cafe once per ceil(n / size) runs.
const many = Array.from({ length: 45 }, (_, i) =>
  cafe({ id: `c${String(i).padStart(2, "0")}` }),
);
const seen = new Set();
let cursor = 0;
for (let run = 0; run < Math.ceil(45 / SWEEP_PER_RUN); run += 1) {
  const { slice, next } = rotate(many.toReversed(), cursor);
  slice.forEach((c) => seen.add(c.id));
  cursor = next;
}
assert.equal(seen.size, 45);
assert.equal(cursor, (3 * SWEEP_PER_RUN) % 45);
assert.deepEqual(
  rotate(many.slice(0, 3), 2).slice.map((c) => c.id),
  ["c02", "c00", "c01"],
);
assert.deepEqual(rotate([], 7), { slice: [], next: 0 });

// queue diff: only ids not seen last run; user reports and error reports are counts only.
const queues = {
  candidates: [
    { id: "1", name: "기존" },
    { id: "2", name: "새 카페" },
  ],
  submissions: [{ id: "s1" }, { id: "s2" }],
  errorReports: [],
};
const news = queueNews(
  { candidates: ["1"], submissions: ["s1"], errorReports: ["e1"] },
  queues,
);
assert.deepEqual(
  news.candidates.map((c) => c.id),
  ["2"],
);
assert.deepEqual(queueLines(news), [
  "새 후보 1: 새 카페",
  "새 제보 1 (내용은 어드민에서)",
]);
assert.deepEqual(
  queueLines(
    queueNews({ candidates: ["1", "2"], submissions: ["s1", "s2"] }, queues),
  ),
  [],
);
assert.equal(
  nameList(
    Array.from({ length: PUSH_NAMES_MAX + 2 }, (_, i) => `n${i}`),
  ).endsWith(" 외 2"),
  true,
);

// findings: pushed once; keys of cafes no longer public are dropped.
const findings = [
  { key: "range:a:1,1", text: "x" },
  { key: "far:b:2,3", text: "y" },
];
assert.deepEqual(
  freshFindings(["range:a:1,1"], findings).map((f) => f.key),
  ["far:b:2,3"],
);
assert.deepEqual(
  prunePushed(["range:a:1,1", "far:gone:1,2", "range:a:1,1"], [cafe()]),
  ["range:a:1,1"],
);

assert.equal(buildMessage([]), null);
assert.deepEqual(buildMessage(["새 제보 1"]), {
  title: "코히리스트",
  text: "새 제보 1\nhttps://kohee.pages.dev/admin",
});

console.log("[admin-watch] ok");
