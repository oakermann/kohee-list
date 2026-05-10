import {
  HttpError,
  cleanText,
  json,
  readJson,
  requireAuth,
  requireRole,
  safeRole,
  withGuard,
} from "./shared.js";
import { safeWriteAuditLog } from "./security.js";

function publicRole(role) {
  return role === "admin" ? "admin" : "user";
}

export async function setRole(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const body = await readJson(req);
    const targetUsername = cleanText(body.username, 40).toLowerCase();
    const role = safeRole(body.role);

    if (!targetUsername || role !== "user" || body.role !== "user") {
      throw new HttpError(400, "Role must be user");
    }

    const target = await env.DB.prepare(
      "SELECT id, role FROM users WHERE username = ?",
    )
      .bind(targetUsername)
      .first();
    if (!target) throw new HttpError(404, "User not found");
    if (target.role === "admin")
      throw new HttpError(403, "Cannot modify admin role");

    await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?")
      .bind(role, target.id)
      .run();
    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "user.set_role",
      targetType: "user",
      targetId: target.id,
      before: { username: targetUsername, role: target.role },
      after: { username: targetUsername, role, actor_role: user.role },
    });
    return json({ ok: true, username: targetUsername, role }, 200, req, env);
  });
}

export async function getUsers(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const q = cleanText(
      new URL(req.url).searchParams.get("q"),
      40,
    ).toLowerCase();
    const like = `%${q}%`;
    const rows = await env.DB.prepare(
      `SELECT id, username, role, created_at
       FROM users
       WHERE (? = '' OR username LIKE ?)
       ORDER BY created_at DESC
       LIMIT 100`,
    )
      .bind(q, like)
      .all();

    const items = (rows.results || []).map((row) => ({
      id: row.id,
      username: row.username,
      role: publicRole(row.role),
      created_at: row.created_at,
    }));

    return json({ ok: true, items }, 200, req, env);
  });
}
