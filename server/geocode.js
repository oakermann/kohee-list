// Address → coordinates. The provider sits behind geocodeAddress alone: swapping Nominatim for a Naver/Kakao key
// changes only that function. Shared by the Pages functions (admin fill, report intake) and scripts/admin-watch.mjs.
// Nominatim policy: identifying User-Agent, at most 1 request/s, cache results (callers pace and cache).
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
export const GEOCODE_USER_AGENT = "kohee-list (https://kohee.pages.dev)";
export const GEOCODE_TIMEOUT_MS = 4000;
export const GEOCODE_QUERY_MAX = 80;
// Written into the admin memo next to auto-filled coordinates — Nominatim resolves Korean road addresses to the road.
export const GEOCODE_SOURCE = "nominatim (road-level)";

// Keep the part a geocoder understands: drop "(…)" notes and floor/room tails after the road + building number.
export function searchQuery(address) {
  const plain = String(address || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // "원효로 48길" → "원효로48길": a numbered side street is one name
    .replace(/(\S(?:로|길)) (\d+번?[가-힣]?길)/g, "$1$2");
  const road = plain.match(/^.*?\S(?:로|길) \d+(?:-\d+)?(?= |$)/);
  return (road ? road[0] : plain).slice(0, GEOCODE_QUERY_MAX);
}

// One best hit {lat, lng, label} or null when nothing matched. Network, timeout and HTTP errors throw.
export async function geocodeAddress(address) {
  const q = searchQuery(address);
  if (q.length < 2) return null;
  const url = `${NOMINATIM_SEARCH}?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": GEOCODE_USER_AGENT },
    signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`geocoder HTTP ${res.status}`);
  const [hit] = await res.json();
  if (!hit) return null;
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name,
  };
}

// District words (…시/군/구) of an address — a hit is trusted only when its label names one of them.
export function districts(address) {
  return String(address || "")
    .split(/[\s,()]+/)
    .filter((word) => /^\S+[시군구]$/.test(word) && word.length >= 2);
}

export function matchesDistrict(address, label) {
  const words = districts(address);
  return words.length > 0 && words.some((word) => String(label).includes(word));
}
