// Used by every screen: API calls, browser token and saved list (no login), dates, Naver Map, sharing.
export const CAT_MAP = {
  espresso: "에스프레소",
  drip: "드립",
  decaf: "디카페인",
  instagram: "인스타",
  dessert: "디저트",
};

export const $ = (id) => document.getElementById(id);

// fetch rejects only when offline or the network fails; its message is English ("Failed to fetch").
export function api(path, options = {}) {
  return fetch(`/api${path}`, { credentials: "same-origin", ...options }).catch(
    () => {
      throw new Error(
        "네트워크에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      );
    },
  );
}

export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "어드민 로그인이 필요합니다.",
  INVALID_CREDENTIALS: "비밀번호가 맞지 않습니다.",
  VALIDATION_ERROR: "입력값을 다시 확인해 주세요.",
  NOT_FOUND: "요청한 항목을 찾을 수 없습니다.",
  RATE_LIMITED: "오늘 받을 수 있는 제보가 다 찼습니다. 내일 다시 보내 주세요.",
  COORDS_REQUIRED: "좌표(위도·경도)가 있어야 공개할 수 있습니다.",
  COORDS_OUT_OF_RANGE:
    "좌표가 한국 밖입니다. 위도·경도가 서로 바뀌었거나 같은 값인지 확인해 주세요.",
};

export async function jsonApi(path, options = {}) {
  const res = await api(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const error = new Error(
      ERROR_MESSAGES[data.code] || data.error || "요청에 실패했습니다.",
    );
    error.code = data.code || "";
    throw error;
  }
  return data;
}

export function postJson(path, body) {
  return jsonApi(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// This browser's random token — the key for 'my reports and answers' instead of login. Clearing it only loses the history view.
export function clientId() {
  let id = storageGet("kohee-client-id");
  if (!id) {
    id = crypto.randomUUID();
    storageSet("kohee-client-id", id);
  }
  return id;
}

// Saved cafes are stored only in this browser.
export function favoriteIds() {
  try {
    return new Set(JSON.parse(storageGet("kohee-favorites") || "[]"));
  } catch {
    return new Set();
  }
}

export function toggleFavorite(cafeId) {
  const ids = favoriteIds();
  if (ids.has(cafeId)) ids.delete(cafeId);
  else ids.add(cafeId);
  if (!storageSet("kohee-favorites", JSON.stringify([...ids]))) {
    throw new Error(
      "이 브라우저는 찜을 저장할 수 없습니다(사생활 보호 모드 등).",
    );
  }
  return ids.has(cafeId);
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function formatDate(value, includeTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = { year: "numeric", month: "2-digit", day: "2-digit" };
  return includeTime
    ? date.toLocaleString("ko-KR", {
        ...day,
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("ko-KR", day);
}

const CITIES = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];
// How long the Naver Map app gets to take over before the web map opens instead.
const NAVER_APP_WAIT_MS = 1800;

function getCity(address) {
  const first = String(address || "").split(" ")[0];
  return CITIES.find((city) => first.includes(city)) || first;
}

// Name + city: keyword search for cafes without a stored place URL.
function naverSearchUrls(cafe) {
  const query = encodeURIComponent(`${cafe.name} ${getCity(cafe.address)}`);
  const appName = encodeURIComponent(location.href.split("#")[0]);
  return {
    webUrl: `https://map.naver.com/p/search/${query}`,
    appUrl: `nmap://search?query=${query}&appname=${appName}`,
    intentUrl: `intent://search?query=${query}&appname=${appName}#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end`,
  };
}

// The app opening hides or blurs this page; if neither happens in time, open the web map instead.
function openMobileNaverMap(appUrl, webUrl) {
  const stop = () => {
    clearTimeout(timer);
    window.removeEventListener("pagehide", stop);
    window.removeEventListener("blur", stop);
    document.removeEventListener("visibilitychange", onVisibility);
  };
  const onVisibility = () => {
    if (document.hidden) stop();
  };
  const timer = setTimeout(() => {
    stop();
    if (!document.hidden) window.location.replace(webUrl);
  }, NAVER_APP_WAIT_MS);
  window.addEventListener("pagehide", stop);
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", onVisibility);
  window.location.href = appUrl;
}

export function openNaverMapForCafe(cafe) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  // A stored place URL wins — keyword search can show the wrong branch first for same-named branches (e.g. Daegu
  // 수평적관계, 3 branches). On phones Naver hands a place URL to the app itself.
  const savedUrl = String(cafe.naver_url || "").trim();
  if (savedUrl) {
    if (isAndroid || isIOS) window.location.href = savedUrl;
    else window.open(savedUrl, "_blank", "noopener");
    return;
  }
  const { webUrl, appUrl, intentUrl } = naverSearchUrls(cafe);
  if (isAndroid) openMobileNaverMap(intentUrl, webUrl);
  else if (isIOS) openMobileNaverMap(appUrl, webUrl);
  else window.open(webUrl, "_blank", "noopener");
}

// Web Share with the cafe's Naver Map search link, else copy the text.
export async function shareCafe(cafe) {
  const text = `[코히 리스트] ${cafe.name}\n주소: ${cafe.address}`;
  if (navigator.share) {
    await navigator.share({
      title: "코히 리스트 공유",
      text,
      url: naverSearchUrls(cafe).webUrl,
    });
    return "shared";
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return "copied";
  }
  throw new Error(text);
}

// The notice is plain text; an error reply (JSON) must never show as the notice.
export async function fetchNotice() {
  const res = await api("/notice");
  if (!res.ok) throw new Error(`notice HTTP ${res.status}`);
  return res.text();
}
