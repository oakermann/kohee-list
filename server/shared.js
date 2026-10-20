// 응답·입력 다듬기·오류 — 모든 핸들러가 쓰는 것만 둔다.
const API_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "content-security-policy":
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
};
// 공개 카페 목록만 1분 캐시 — 나머지(어드민·내 제보)는 매번 새로.
const PUBLIC_CACHE = "public, max-age=60";

export class HttpError extends Error {
  constructor(status, message, code = "") {
    super(message);
    this.status = status;
    this.code = code || (status === 404 ? "NOT_FOUND" : "VALIDATION_ERROR");
  }
}

export function json(body, status = 200, { cache = false, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...API_HEADERS,
      "cache-control": cache ? PUBLIC_CACHE : "no-store",
      ...headers,
    },
  });
}

export function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...API_HEADERS,
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) {
    throw new HttpError(415, "Expected JSON body");
  }
  return req.json();
}

export function nowIso() {
  return new Date().toISOString();
}

export function cleanText(value, max = 1000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export function cleanNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function cleanUrl(value) {
  const raw = cleanText(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function parseJsonArray(value) {
  if (Array.isArray(value))
    return value.map((v) => cleanText(v)).filter(Boolean);
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parseJsonArray(parsed) : [];
  } catch {
    return [];
  }
}

// 브라우저가 만든 무작위 표 — 로그인 없이 '내 제보'를 찾는 열쇠.
export function cleanClientId(value) {
  const id = cleanText(value, 80);
  if (!/^[A-Za-z0-9-]{16,80}$/.test(id)) {
    throw new HttpError(400, "client_id required");
  }
  return id;
}

export async function sha256Hex(input) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(a, b) {
  const left = String(a);
  const right = String(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1)
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export function getCookie(req, key) {
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === key) return decodeURIComponent(rest.join("="));
  }
  return "";
}
