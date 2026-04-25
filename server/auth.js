import {
  HttpError,
  clearCookieHeader,
  cleanText,
  cookieHeader,
  getAuthToken,
  getSessionUser,
  hashPassword,
  hashSessionToken,
  json,
  nowIso,
  readJson,
  verifyPassword,
  withGuard,
} from "./shared.js";

export async function signup(req, env) {
  return withGuard(req, env, async () => {
    const body = await readJson(req);
    const username = cleanText(body.username, 40).toLowerCase();
    const password = String(body.password || "");

    if (!/^[a-z0-9_]{4,20}$/.test(username)) {
      throw new HttpError(400, "Username must be 4-20 chars of a-z, 0-9, _");
    }
    if (password.length < 8 || password.length > 72) {
      throw new HttpError(400, "Password must be 8-72 chars");
    }

    const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (exists) throw new HttpError(409, "Username already exists");

    const countRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
    const isFirstUser = Number(countRow?.c || 0) === 0;
    const role = isFirstUser ? "admin" : "user";

    if (isFirstUser) {
      const expectedCode = env.FIRST_ADMIN_CODE || "";
      const adminCode = String(body.admin_code || "");
      if (!expectedCode) throw new HttpError(403, "First admin code is not configured");
      if (adminCode !== expectedCode) throw new HttpError(403, "Invalid first admin code");
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await env.DB.prepare(
      "INSERT INTO users(id, username, password_hash, role, created_at) VALUES(?, ?, ?, ?, ?)",
    ).bind(id, username, passwordHash, role, nowIso()).run();

    return json({ ok: true, username, role }, 201, req, env);
  });
}

export async function login(req, env) {
  return withGuard(req, env, async () => {
    const body = await readJson(req);
    const username = cleanText(body.username, 40).toLowerCase();
    const password = String(body.password || "");

    const user = await env.DB.prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?").bind(username).first();
    if (!user) throw new HttpError(401, "Invalid credentials");

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new HttpError(401, "Invalid credentials");

    const rawToken = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const tokenHash = await hashSessionToken(rawToken, env);

    const days = Math.max(1, Number(env.SESSION_DAYS || "14"));
    const maxAgeSec = days * 86400;
    const expiresAt = new Date(Date.now() + maxAgeSec * 1000).toISOString();

    await env.DB.prepare(
      "INSERT INTO sessions(id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), user.id, tokenHash, expiresAt, nowIso()).run();

    return json(
      { ok: true, token: rawToken, user: { id: user.id, username: user.username, role: user.role } },
      200,
      req,
      env,
      { "set-cookie": cookieHeader(rawToken, maxAgeSec) },
    );
  });
}

export async function logout(req, env) {
  return withGuard(req, env, async () => {
    const token = getAuthToken(req);
    if (token) {
      const tokenHash = await hashSessionToken(token, env);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
    return json({ ok: true }, 200, req, env, { "set-cookie": clearCookieHeader() });
  });
}

export async function me(req, env) {
  return withGuard(req, env, async () => {
    const user = await getSessionUser(req, env);
    if (!user) return json({ ok: true, user: null }, 200, req, env);
    return json({ ok: true, user: { id: user.user_id, username: user.username, role: user.role } }, 200, req, env);
  });
}
