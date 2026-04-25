export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};
export const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};
export const SESSION_COOKIE = "kohee_session";
export const CSRF_COOKIE = "kohee_csrf";
export const ROLES = ["user", "manager", "admin"];
export const SESSION_MAX_AGE = 14 * 24 * 60 * 60;

export function nowIso() {
  return new Date().toISOString();
}

export function health(req, env) {
  return json({ ok: true }, 200, req, env);
}

function appendHeaders(headers, source = {}) {
  for (const [key, value] of Object.entries(source || {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined && value !== null) {
      headers.set(key, value);
    }
  }
  return headers;
}

export function responseHeaders(req, env, extraHeaders = {}) {
  const headers = new Headers();
  appendHeaders(headers, JSON_HEADERS);
  appendHeaders(headers, SECURITY_HEADERS);
  appendHeaders(headers, corsHeaders(req, env));
  appendHeaders(headers, extraHeaders);
  return headers;
}

export function json(
  body,
  status = 200,
  req = null,
  env = {},
  extraHeaders = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req, env, extraHeaders),
  });
}

export function text(
  body,
  status = 200,
  req = null,
  env = {},
  extraHeaders = {},
) {
  return new Response(body, {
    status,
    headers: responseHeaders(req, env, {
      "content-type": "text/plain; charset=utf-8",
      ...extraHeaders,
    }),
  });
}

function configuredOrigins(env) {
  return String(env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function isCorsOriginAllowed(req, env) {
  const origin = req?.headers?.get?.("origin") || "";
  if (!origin) return true;
  if (origin === "null") return env.ALLOW_NULL_ORIGIN === "1";

  const configured = configuredOrigins(env);
  if (!configured.length) return false;
  if (configured.includes(origin)) return true;

  return configured.some((rule) => {
    if (!rule.startsWith("*.")) return false;
    try {
      const originUrl = new URL(origin);
      return originUrl.hostname.endsWith(rule.slice(1));
    } catch {
      return false;
    }
  });
}

export function corsHeaders(req, env) {
  const origin = req?.headers?.get?.("origin") || "";
  const headers = {
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-csrf-token",
    vary: "origin",
  };

  if (origin && isCorsOriginAllowed(req, env)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
  }

  return headers;
}

export function corsPreflight(req, env) {
  if (!isCorsOriginAllowed(req, env)) {
    return json(
      { ok: false, error: "Forbidden origin", code: "FORBIDDEN_ORIGIN" },
      403,
      req,
      env,
    );
  }

  return new Response(null, {
    status: 204,
    headers: responseHeaders(req, env),
  });
}

export async function readJson(req) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "Expected JSON body", "VALIDATION_ERROR");
  }
  return req.json();
}

export function safeRole(role) {
  return ROLES.includes(role) ? role : "user";
}

export function normalizeBool(value) {
  return value ? 1 : 0;
}

export function cleanNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function cleanText(value, max = 1000) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

export function cleanUrl(value) {
  const v = cleanText(value, 500);
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    for (const [key, paramValue] of [...u.searchParams.entries()]) {
      const normalized = String(paramValue || "")
        .trim()
        .toLowerCase();
      if (!normalized || normalized === "undefined" || normalized === "null") {
        u.searchParams.delete(key);
        continue;
      }

      if (String(paramValue).includes("|")) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return "";
  }
}

export function parseJsonArray(value) {
  const normalize = (items) =>
    items
      .flatMap((v) => String(v || "").split(/[|,]/))
      .map((v) => v.trim())
      .filter(
        (v) =>
          v && v.toLowerCase() !== "undefined" && v.toLowerCase() !== "null",
      );

  if (Array.isArray(value)) return normalize(value);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalize(parsed);
      return normalize([parsed]);
    } catch {
      return normalize([value]);
    }
  }
  return [];
}

export async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);
  const iterations = 100000;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    key,
    256,
  );
  const hash = bytesToBase64(new Uint8Array(bits));
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export async function verifyPassword(password, encoded) {
  const [algo, it, salt, hash] = String(encoded || "").split("$");
  if (algo !== "pbkdf2") return false;
  const iterations = Number(it);
  if (!iterations || !salt || !hash) return false;

  const saltBytes = base64ToBytes(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    key,
    256,
  );
  const compare = bytesToBase64(new Uint8Array(bits));
  return safeEqual(compare, hash);
}

export function safeEqual(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i += 1) {
    diff |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  }
  return diff === 0;
}

// SESSION_SECRET is required for every environment that handles auth/session flows.
export function getRequiredSessionSecret(env) {
  const secret = String(env.SESSION_SECRET || "").trim();
  if (!secret) {
    throw new HttpError(
      500,
      "SESSION_SECRET is not configured",
      "SERVER_ERROR",
    );
  }
  return secret;
}

export async function hashSessionToken(token, env) {
  const secret = getRequiredSessionSecret(env);
  return sha256Hex(`${token}:${secret}`);
}

export async function hashCsrfToken(token, env) {
  const secret = getRequiredSessionSecret(env);
  return sha256Hex(`${token}:csrf:${secret}`);
}

export function getClientIp(req) {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

export async function getClientIpHash(req, env) {
  const secret = getRequiredSessionSecret(env);
  return sha256Hex(`${getClientIp(req)}:ip:${secret}`);
}

export function getCookie(req, key) {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((v) => v.trim());
  for (const part of parts) {
    if (!part.includes("=")) continue;
    const [k, ...rest] = part.split("=");
    if (k === key) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function getAuthToken(req) {
  const cookieToken = getCookie(req, SESSION_COOKIE);
  if (cookieToken) return cookieToken;

  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function cookieHeader(token, maxAgeSec = SESSION_MAX_AGE) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=None; Secure`;
}

export function clearCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure`;
}

export function csrfCookieHeader(token, maxAgeSec = SESSION_MAX_AGE) {
  return `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=None; Secure`;
}

export function clearCsrfCookieHeader() {
  return `${CSRF_COOKIE}=; Path=/; Max-Age=0; SameSite=None; Secure`;
}

export async function getSessionUser(req, env) {
  const token = getAuthToken(req);
  if (!token) return null;

  const tokenHash = await hashSessionToken(token, env);
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.user_id, s.expires_at, s.csrf_token_hash,
            u.username, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
  )
    .bind(tokenHash)
    .first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(row.session_id)
      .run();
    return null;
  }
  return row;
}

export function isUnsafeMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(
    String(method || "").toUpperCase(),
  );
}

export async function requireCsrf(req, env, user) {
  if (!isUnsafeMethod(req.method)) return;
  const auth = req.headers.get("authorization") || "";
  const hasBearer = /^Bearer\s+.+$/i.test(auth);
  const hasSessionCookie = !!getCookie(req, SESSION_COOKIE);
  if (hasBearer && !hasSessionCookie) return;

  if (!user?.csrf_token_hash) {
    throw new HttpError(403, "CSRF token required", "CSRF_REQUIRED");
  }

  const token = req.headers.get("x-csrf-token") || "";
  if (!token) {
    throw new HttpError(403, "CSRF token required", "CSRF_REQUIRED");
  }

  const hash = await hashCsrfToken(token, env);
  if (hash !== user.csrf_token_hash) {
    throw new HttpError(403, "Invalid CSRF token", "CSRF_INVALID");
  }
}

export async function requireAuth(req, env) {
  const user = await getSessionUser(req, env);
  if (!user) throw new HttpError(401, "Login required", "AUTH_REQUIRED");
  await requireCsrf(req, env, user);
  return user;
}

export function requireRole(user, allowed) {
  if (!allowed.includes(user.role))
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
}

export async function cleanupExpiredSessions(env) {
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .bind(nowIso())
    .run();
}

export function errorCodeForStatus(status) {
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "DUPLICATE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "SERVER_ERROR";
}

export class HttpError extends Error {
  constructor(status, message, code = "") {
    super(message);
    this.status = status;
    this.code = code || errorCodeForStatus(status);
  }
}

export async function withGuard(req, env, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return json(
        { ok: false, error: err.message, code: err.code },
        err.status,
        req,
        env,
      );
    }
    return json(
      {
        ok: false,
        error: err.message || "Server error",
        code: "SERVER_ERROR",
      },
      500,
      req,
      env,
    );
  }
}
