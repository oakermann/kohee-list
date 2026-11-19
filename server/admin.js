// Admin lock = one password (Pages secret ADMIN_PASSWORD). No user or session tables.
// Login gives an 'expiry.signature' cookie — the signing key is the password, so changing the password invalidates every cookie.
// SameSite=Strict, so requests from other sites carry no cookie (no CSRF token needed).
import {
  HttpError,
  getCookie,
  json,
  readJson,
  safeEqual,
  sha256Hex,
} from "./shared.js";

const COOKIE = "kohee_admin";
const MAX_AGE_SEC = 30 * 86400;

async function sign(env, expiresAt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ADMIN_PASSWORD),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(expiresAt)),
  );
  return [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export async function isAdmin(req, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const [expiresAt, mac] = getCookie(req, COOKIE).split(".");
  if (!mac || Number(expiresAt) < Date.now() / 1000) return false;
  return safeEqual(mac, await sign(env, expiresAt));
}

export function adminOnly(handler) {
  return async (req, env) => {
    if (!(await isAdmin(req, env)))
      throw new HttpError(401, "Admin login required", "AUTH_REQUIRED");
    return handler(req, env);
  };
}

export async function adminLogin(req, env) {
  if (!env.ADMIN_PASSWORD)
    throw new HttpError(500, "ADMIN_PASSWORD is not configured");
  const { password } = await readJson(req);
  // Compare hashes — finishes in the same time even if lengths differ.
  const ok = safeEqual(
    await sha256Hex(String(password ?? "")),
    await sha256Hex(env.ADMIN_PASSWORD),
  );
  if (!ok) throw new HttpError(401, "Wrong password", "INVALID_CREDENTIALS");
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  return json({ ok: true }, 200, {
    headers: {
      "set-cookie": cookieHeader(
        `${expiresAt}.${await sign(env, expiresAt)}`,
        MAX_AGE_SEC,
      ),
    },
  });
}

export function adminLogout() {
  return json({ ok: true }, 200, {
    headers: { "set-cookie": cookieHeader("", 0) },
  });
}

export async function adminMe(req, env) {
  return json({ ok: true, admin: await isAdmin(req, env) });
}
