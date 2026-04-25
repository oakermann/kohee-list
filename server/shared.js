export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
export const SESSION_COOKIE = "kohee_session";
export const ROLES = ["user", "manager", "admin"];

export function nowIso() {
  return new Date().toISOString();
}

export function health(req, env) {
  return json({ ok: true }, 200, req, env);
}

export function json(body, status, req, env, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders(req, env),
      ...extraHeaders,
    },
  });
}

export function text(body, status, req, env, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...corsHeaders(req, env),
      ...extraHeaders,
    },
  });
}

export function corsHeaders(req, env) {
  const origin = req.headers.get("origin") || "";
  const configured = String(env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  let allowOrigin = "*";

  if (origin === "null") {
    allowOrigin = "null";
  } else if (origin) {
    if (!configured.length || configured.includes("*")) {
      allowOrigin = origin;
    } else {
      const matched = configured.some((rule) => {
        if (origin === rule) return true;
        try {
          const reqUrl = new URL(origin);
          const ruleUrl = new URL(rule);
          return reqUrl.protocol === ruleUrl.protocol && reqUrl.hostname.endsWith(`.${ruleUrl.hostname}`);
        } catch (error) {
          return false;
        }
      });
      allowOrigin = matched ? origin : configured[0];
    }
  } else if (configured.length && !configured.includes("*")) {
    allowOrigin = configured[0];
  }

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    vary: "origin",
  };
}

export function corsPreflight(req, env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req, env),
  });
}

export async function readJson(req) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("Invalid content-type");
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
  return String(value || "").trim().slice(0, max);
}

export function cleanUrl(value) {
  const v = cleanText(value, 500);
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    for (const [key, paramValue] of [...u.searchParams.entries()]) {
      const normalized = String(paramValue || "").trim().toLowerCase();
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
  const normalize = (items) => items
    .flatMap((v) => String(v || "").split(/[|,]/))
    .map((v) => v.trim())
    .filter((v) => v && v.toLowerCase() !== "undefined" && v.toLowerCase() !== "null");

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
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
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
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
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

export async function hashSessionToken(token, env) {
  const secret = env.SESSION_SECRET || "dev-secret-change-me";
  return sha256Hex(`${token}:${secret}`);
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

export function cookieHeader(token, maxAgeSec) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=None; Secure`;
}

export function clearCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure`;
}

export async function getSessionUser(req, env) {
  const token = getAuthToken(req);
  if (!token) return null;

  const tokenHash = await hashSessionToken(token, env);
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.user_id, s.expires_at, u.username, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
  ).bind(tokenHash).first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(row.session_id).run();
    return null;
  }
  return row;
}

export async function requireAuth(req, env) {
  const user = await getSessionUser(req, env);
  if (!user) throw new HttpError(401, "Login required");
  return user;
}

export function requireRole(user, allowed) {
  if (!allowed.includes(user.role)) throw new HttpError(403, "Forbidden");
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function withGuard(req, env, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ ok: false, error: err.message }, err.status, req, env);
    }
    return json({ ok: false, error: err.message || "Server error" }, 500, req, env);
  }
}
