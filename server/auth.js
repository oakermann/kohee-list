import {
  HttpError,
  clearCookieHeader,
  clearCsrfCookieHeader,
  cleanText,
  cookieHeader,
  cleanupExpiredSessions,
  csrfCookieHeader,
  getAuthToken,
  getClientIpHash,
  getSessionUser,
  hashCsrfToken,
  hashPassword,
  hashSessionToken,
  json,
  nowIso,
  readJson,
  safeRole,
  verifyPassword,
  withGuard,
} from "./shared.js";
import {
  assertRateLimitOpen,
  clearRateLimit,
  consumeRateLimit,
  rateLimitKey,
  recordRateLimitFailure,
} from "./security.js";

function publicRole(role) {
  return safeRole(role) === "admin" ? "admin" : "user";
}

function secureRandomToken() {
  return (
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "")
  );
}

export async function signup(req, env) {
  return withGuard(req, env, async () => {
    const body = await readJson(req);
    const username = cleanText(body.username, 40).toLowerCase();
    const password = String(body.password || "");
    const signupKey = await rateLimitKey(req, env, "signup");
    await consumeRateLimit(env, signupKey, 5, 10);

    if (!/^[a-z0-9_]{4,20}$/.test(username)) {
      throw new HttpError(
        400,
        "Username must be 4-20 chars of a-z, 0-9, _",
        "VALIDATION_ERROR",
      );
    }
    if (password.length < 8 || password.length > 72) {
      throw new HttpError(
        400,
        "Password must be 8-72 chars",
        "VALIDATION_ERROR",
      );
    }

    const exists = await env.DB.prepare(
      "SELECT id FROM users WHERE username = ?",
    )
      .bind(username)
      .first();
    if (exists)
      throw new HttpError(409, "Username already exists", "DUPLICATE");

    const countRow = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM users",
    ).first();
    const isFirstUser = Number(countRow?.c || 0) === 0;
    const role = isFirstUser ? "admin" : "user";

    if (isFirstUser) {
      const expectedCode = env.FIRST_ADMIN_CODE || "";
      const adminCode = String(body.admin_code || "");
      if (!expectedCode) {
        throw new HttpError(
          403,
          "First admin code is not configured",
          "FIRST_ADMIN_CODE_NOT_CONFIGURED",
        );
      }
      if (!adminCode) {
        throw new HttpError(
          403,
          "First admin code required",
          "FIRST_ADMIN_CODE_REQUIRED",
        );
      }
      if (adminCode !== expectedCode) {
        throw new HttpError(
          403,
          "Invalid first admin code",
          "FIRST_ADMIN_CODE_INVALID",
        );
      }
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await env.DB.prepare(
      "INSERT INTO users(id, username, password_hash, role, created_at) VALUES(?, ?, ?, ?, ?)",
    )
      .bind(id, username, passwordHash, role, nowIso())
      .run();

    return json({ ok: true, username, role }, 201, req, env);
  });
}

export async function login(req, env) {
  return withGuard(req, env, async () => {
    await cleanupExpiredSessions(env);

    const body = await readJson(req);
    const username = cleanText(body.username, 40).toLowerCase();
    const password = String(body.password || "");
    const loginKey = await rateLimitKey(req, env, "login", [username]);
    await assertRateLimitOpen(env, loginKey, 5);

    const user = await env.DB.prepare(
      "SELECT id, username, password_hash, role FROM users WHERE username = ?",
    )
      .bind(username)
      .first();

    if (!user) {
      await recordRateLimitFailure(env, loginKey, 10);
      throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await recordRateLimitFailure(env, loginKey, 10);
      throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    await clearRateLimit(env, loginKey);

    const rawToken = secureRandomToken();
    const csrfToken = secureRandomToken();
    const tokenHash = await hashSessionToken(rawToken, env);
    const csrfTokenHash = await hashCsrfToken(csrfToken, env);
    const ipHash = await getClientIpHash(req, env);
    const userAgent = cleanText(req.headers.get("user-agent") || "", 300);

    const days = Math.max(1, Number(env.SESSION_DAYS || "14"));
    const maxAgeSec = days * 86400;
    const expiresAt = new Date(Date.now() + maxAgeSec * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO sessions
         (id, user_id, token_hash, csrf_token_hash, user_agent, ip_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        user.id,
        tokenHash,
        csrfTokenHash,
        userAgent,
        ipHash,
        expiresAt,
        nowIso(),
      )
      .run();

    return json(
      {
        ok: true,
        user: { id: user.id, username: user.username, role: publicRole(user.role) },
        csrfToken,
      },
      200,
      req,
      env,
      {
        "set-cookie": [
          cookieHeader(rawToken, maxAgeSec),
          csrfCookieHeader(csrfToken, maxAgeSec),
        ],
      },
    );
  });
}

export async function logout(req, env) {
  return withGuard(req, env, async () => {
    const token = getAuthToken(req);
    if (token) {
      const tokenHash = await hashSessionToken(token, env);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(tokenHash)
        .run();
    }
    return json({ ok: true }, 200, req, env, {
      "set-cookie": [clearCookieHeader(), clearCsrfCookieHeader()],
    });
  });
}

export async function me(req, env) {
  return withGuard(req, env, async () => {
    await cleanupExpiredSessions(env);

    const user = await getSessionUser(req, env);
    if (!user) return json({ ok: true, user: null }, 200, req, env);

    const csrfToken = secureRandomToken();
    const csrfTokenHash = await hashCsrfToken(csrfToken, env);
    await env.DB.prepare("UPDATE sessions SET csrf_token_hash = ? WHERE id = ?")
      .bind(csrfTokenHash, user.session_id)
      .run();

    return json(
      {
        ok: true,
        user: { id: user.user_id, username: user.username, role: publicRole(user.role) },
        csrfToken,
      },
      200,
      req,
      env,
      { "set-cookie": csrfCookieHeader(csrfToken) },
    );
  });
}
