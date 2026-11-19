// Does a cafe's stored pin match Kakao? Shared by the admin "확인 필요" tab (/cafe-check) and scripts/admin-watch.mjs.
import { findCafe, hasValidCoords, outsideKorea } from "./cafes.js";
import { findPlace, geocodeAddress } from "./geocode.js";
import { HttpError, json } from "./shared.js";

// Measured 11/18, stored vs Kakao (place, else address) for all 128: median 5 m, p95 24 m, then 149, 261, 588 m.
// Kakao is building/place level, so anything past 100 m is a misplaced pin, not noise.
export const FAR_M = 100;
const EARTH_RADIUS_M = 6371000;

export function haversineM(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// What is wrong with a cafe's coordinates on their own, or "" when nothing.
export function rangeProblem(cafe) {
  if (outsideKorea(cafe)) {
    return cafe.lat === cafe.lng
      ? `위도=경도 ${Number(cafe.lat).toFixed(4)}`
      : `한국 밖 ${cafe.lat}, ${cafe.lng}`;
  }
  return hasValidCoords(cafe) ? "" : "좌표 없음";
}

export function distanceProblem(cafe, reference) {
  if (!reference) return "";
  const m = haversineM(cafe, reference);
  return m > FAR_M ? `카카오 위치와 ${Math.round(m)}m` : "";
}

// The address point, then the listing near it (or near the stored pin when the address does not resolve).
// Kakao errors throw — the caller decides whether that is a failed lookup.
export async function lookUpCafe(cafe, key) {
  const point = await geocodeAddress(cafe.address, key);
  const near = point || (rangeProblem(cafe) ? null : cafe);
  const place = near ? await findPlace(cafe.name, near, key) : null;
  return { point, place };
}

// Every mismatch for one cafe, pin first; pinOff = the stored pin itself is wrong (moving it to Kakao fixes it).
export function problemsOf(cafe, { point, place }) {
  const pin = rangeProblem(cafe) || distanceProblem(cafe, place || point);
  const problems = [
    pin,
    !point && "주소를 카카오가 못 찾음",
    !place && "카카오에 같은 이름 없음 (폐업·이름 바뀜?)",
  ].filter(Boolean);
  return { problems, pinOff: Boolean(pin) };
}

// GET /cafe-check?id= → { problems, pinOff, kakao: {lat, lng, label, name?, placeUrl?} | null }
export async function checkCafe(req, env) {
  if (!env.KAKAO_REST_KEY) throw new HttpError(503, "Geocoding not configured");
  const cafe = await findCafe(env, new URL(req.url).searchParams.get("id"));
  const found = await lookUpCafe(cafe, env.KAKAO_REST_KEY);
  return json({
    ok: true,
    ...problemsOf(cafe, found),
    kakao: found.place || found.point,
  });
}
