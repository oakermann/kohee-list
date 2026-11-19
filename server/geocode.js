// Address and place lookups. The provider (Kakao Local) lives in this file alone; callers pass the REST key
// (Pages secret KAKAO_REST_KEY on the server, ~/.config/secrets/kakao-rest-key on the owner's Mac).
// Shared by the Pages functions (admin fill, report intake) and scripts/admin-watch.mjs.
const KAKAO_LOCAL = "https://dapi.kakao.com/v2/local/search";
const GEOCODE_TIMEOUT_MS = 4000;
export const GEOCODE_QUERY_MAX = 80;
const PLACE_RADIUS_M = 300; // a listed place this close to the address point is the cafe
const NAME_OVERLAP_MIN = 0.5; // bigram overlap (Dice) for two spellings of one name

// Keep the part an address search understands: drop "(…)" notes and floor/room tails after the road + number.
function searchQuery(address) {
  const plain = String(address || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // "원효로 48길" → "원효로48길": a numbered side street is one name
    .replace(/(\S(?:로|길)) (\d+번?[가-힣]?길)/g, "$1$2");
  const road = plain.match(/^.*?\S(?:로|길) \d+(?:-\d+)?(?= |$)/);
  return (road ? road[0] : plain).slice(0, GEOCODE_QUERY_MAX);
}

// District words (…시/군/구) of an address — a hit is trusted only when it names one of them.
function districts(address) {
  return String(address || "")
    .split(/[\s,()]+/)
    .filter((word) => /^\S+[시군구]$/.test(word) && word.length >= 2);
}

export function matchesDistrict(address, label) {
  const words = districts(address);
  return words.length > 0 && words.some((word) => String(label).includes(word));
}

// Same cafe name? Spaces/punctuation ignored; containment (branch suffixes) or bigram overlap ("공지 카페" = "카페공지").
function sameName(a, b) {
  const tidy = (name) =>
    String(name || "")
      .toLowerCase()
      .replace(/[^0-9a-z가-힣]/g, "");
  const [x, y] = [tidy(a), tidy(b)];
  if (x.length < 2 || y.length < 2) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const pairs = (word) =>
    new Set([...word].slice(1).map((ch, i) => word[i] + ch));
  const [px, py] = [pairs(x), pairs(y)];
  const shared = [...px].filter((pair) => py.has(pair)).length;
  return (2 * shared) / (px.size + py.size) >= NAME_OVERLAP_MIN;
}

async function kakaoSearch(kind, params, key) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${KAKAO_LOCAL}/${kind}.json?${query}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`kakao ${kind} search HTTP ${res.status}`);
  return (await res.json()).documents;
}

// Address → {lat, lng, label}, or null when nothing or more than one place matches. Errors throw.
export async function geocodeAddress(address, key) {
  const q = searchQuery(address);
  if (q.length < 2) return null;
  const docs = await kakaoSearch("address", { query: q }, key);
  if (docs.length !== 1) return null;
  const [doc] = docs;
  const label = doc.road_address?.address_name || doc.address_name;
  return { lat: Number(doc.y), lng: Number(doc.x), label };
}

// The listed place named like the cafe within PLACE_RADIUS_M of `near` (its address point): full name first,
// then the first word (a branch suffix often hides the listing). {lat, lng, label, name, placeUrl} or null.
export async function findPlace(name, near, key) {
  const area = {
    x: near.lng,
    y: near.lat,
    radius: PLACE_RADIUS_M,
    sort: "distance",
  };
  for (const query of new Set([name.trim(), name.trim().split(/\s+/)[0]])) {
    const docs = await kakaoSearch("keyword", { query, ...area }, key);
    const doc = docs.find((d) => sameName(name, d.place_name));
    if (doc) {
      return {
        lat: Number(doc.y),
        lng: Number(doc.x),
        label: doc.road_address_name || doc.address_name,
        name: doc.place_name,
        placeUrl: doc.place_url,
      };
    }
  }
  return null;
}
