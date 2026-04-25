export const API_BASE =
  window.__API_BASE__ || "https://kohee-list.gabefinder.workers.dev";
export const CAT_MAP = {
  espresso: "에스프레소",
  drip: "드립",
  decaf: "디카페인",
  instagram: "인스타",
  dessert: "디저트",
};

export const $ = (id) => document.getElementById(id);

export function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function cleanParts(values) {
  const arr = Array.isArray(values) ? values : [values];
  return arr
    .flatMap((value) => String(value || "").split(/[|,]/))
    .map((value) => value.trim())
    .filter(
      (value) =>
        value &&
        value.toLowerCase() !== "undefined" &&
        value.toLowerCase() !== "null",
    );
}

export function clearAuthToken() {
  try {
    // Remove legacy bearer-token storage from older builds.
    localStorage.removeItem("kohee_auth_token");
  } catch {}
}

export function getStorageValue(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function setStorageValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export async function api(path, options = {}) {
  return fetch(API_BASE + path, {
    ...options,
    credentials: "include",
    headers: options.headers || {},
  });
}

export async function jsonApi(path, options = {}) {
  const res = await api(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

export function roleLabel(role) {
  return (
    { user: "일반 유저", manager: "매니저", admin: "관리자" }[role] || role
  );
}

export function statusLabel(status) {
  return (
    { pending: "검토중", approved: "승인", rejected: "반려" }[status] || status
  );
}

export function errorStatusLabel(status) {
  return { open: "확인 대기", resolved: "처리 완료" }[status] || status;
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
  const city = getCity(cafe.address || "");
  const keyword = `${cafe.name} ${city}`;
  const { webUrl, appUrl, intentUrl } = buildNaverMapUrls(keyword);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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

export function modalDescHtml(desc, signature) {
  const signatureParts = cleanParts(signature);
  const descHtml = desc
    ? `<div class="modal-copy-text">${esc(desc)}</div>`
    : "";
  const signatureHtml = signatureParts.length
    ? `
      <div class="modal-signature">
        <div class="modal-signature-label">대표메뉴</div>
        <div class="modal-signature-value">${signatureParts.map((value) => esc(value)).join(", ")}</div>
      </div>
    `
    : "";

  return descHtml || signatureHtml
    ? `${descHtml}${signatureHtml}`
    : `<div class="modal-copy-empty">소개가 아직 없습니다.</div>`;
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
