// 모든 화면이 쓰는 것: API 호출, 브라우저 표·찜(로그인 없음), 날짜, 네이버 지도·공유.
export const CAT_MAP = {
  espresso: "에스프레소",
  drip: "드립",
  decaf: "디카페인",
  instagram: "인스타",
  dessert: "디저트",
};

export const $ = (id) => document.getElementById(id);

export function api(path, options = {}) {
  return fetch(`/api${path}`, { credentials: "same-origin", ...options });
}

const ERROR_MESSAGES = {
  AUTH_REQUIRED: "어드민 로그인이 필요합니다.",
  INVALID_CREDENTIALS: "비밀번호가 맞지 않습니다.",
  VALIDATION_ERROR: "입력값을 다시 확인해 주세요.",
  NOT_FOUND: "요청한 항목을 찾을 수 없습니다.",
  RATE_LIMITED: "오늘 받을 수 있는 제보가 다 찼습니다. 내일 다시 보내 주세요.",
  COORDS_REQUIRED: "좌표(위도·경도)가 있어야 공개할 수 있습니다.",
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

// 이 브라우저의 무작위 표 — 로그인 대신 '내 제보·답변'을 찾는 열쇠. 지우면 내역 보기만 사라진다.
export function clientId() {
  let id = storageGet("kohee-client-id");
  if (!id) {
    id = crypto.randomUUID();
    storageSet("kohee-client-id", id);
  }
  return id;
}

// 찜은 이 브라우저에만 저장한다.
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

  if (includeTime) {
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getCity(address) {
  const first = String(address || "").split(" ")[0];
  if (first.includes("서울")) return "서울";
  if (first.includes("부산")) return "부산";
  if (first.includes("대구")) return "대구";
  if (first.includes("인천")) return "인천";
  if (first.includes("광주")) return "광주";
  if (first.includes("대전")) return "대전";
  if (first.includes("울산")) return "울산";
  if (first.includes("세종")) return "세종";
  if (first.includes("경기")) return "경기";
  if (first.includes("강원")) return "강원";
  if (first.includes("충북")) return "충북";
  if (first.includes("충남")) return "충남";
  if (first.includes("전북")) return "전북";
  if (first.includes("전남")) return "전남";
  if (first.includes("경북")) return "경북";
  if (first.includes("경남")) return "경남";
  if (first.includes("제주")) return "제주";
  return first;
}

export function buildNaverMapUrls(keyword) {
  const encodedQuery = encodeURIComponent(keyword);
  const appName = encodeURIComponent(
    (location.href || "").split("#")[0] || "https://kohee.pages.dev",
  );
  return {
    webUrl: `https://map.naver.com/p/search/${encodedQuery}`,
    appUrl: `nmap://search?query=${encodedQuery}&appname=${appName}`,
    intentUrl: `intent://search?query=${encodedQuery}&appname=${appName}#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end`,
  };
}

export function openMobileNaverMap(primaryUrl, fallbackUrl) {
  let settled = false;
  let timer = null;

  const cleanup = () => {
    window.removeEventListener("pagehide", handleHide);
    window.removeEventListener("blur", handleHide);
    document.removeEventListener("visibilitychange", handleVisibility);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    cleanup();
  };

  const handleHide = () => finish();
  const handleVisibility = () => {
    if (document.hidden) finish();
  };

  window.addEventListener("pagehide", handleHide, { once: true });
  window.addEventListener("blur", handleHide, { once: true });
  document.addEventListener("visibilitychange", handleVisibility, {
    once: true,
  });

  timer = setTimeout(() => {
    if (settled || document.hidden) {
      finish();
      return;
    }
    finish();
    window.location.replace(fallbackUrl);
  }, 1800);

  window.location.href = primaryUrl;
}

export function openNaverMapForCafe(cafe) {
  // 저장된 place URL이 있으면 그것을 우선한다 -- 키워드 검색은 동명 지점(예: 대구
  // 수평적관계 3곳)에서 엉뚱한 지점을 먼저 보여줄 수 있다. 없으면 기존 검색 폴백.
  const savedUrl = String(cafe.naver_url || "").trim();
  const city = getCity(cafe.address || "");
  const keyword = `${cafe.name} ${city}`;
  const { webUrl, appUrl, intentUrl } = buildNaverMapUrls(keyword);
  const targetWebUrl = savedUrl || webUrl;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (savedUrl) {
    // place URL은 웹으로 바로 연다 (모바일에선 네이버가 자체적으로 앱 연결 처리).
    if (isAndroid || isIOS) {
      window.location.href = targetWebUrl;
      return;
    }
    window.open(targetWebUrl, "_blank", "noopener");
    return;
  }

  if (isAndroid) {
    openMobileNaverMap(intentUrl, webUrl);
    return;
  }

  if (isIOS) {
    openMobileNaverMap(appUrl, webUrl);
    return;
  }

  window.open(webUrl, "_blank", "noopener");
}

export async function shareCafe(cafe, fallbackUrl = location.href) {
  const text = `[코히 리스트] ${cafe.name}\n주소: ${cafe.address}`;
  if (navigator.share) {
    await navigator.share({
      title: "코히 리스트 공유",
      text,
      url: fallbackUrl,
    });
    return "shared";
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return "copied";
  }

  throw new Error(text);
}
