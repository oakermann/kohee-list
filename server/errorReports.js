import {
  HttpError,
  cleanText,
  json,
  nowIso,
  readJson,
  requireAuth,
  requireRole,
  withGuard,
} from "./shared.js";

export function toErrorReportResponse(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username || "",
    title: row.title,
    page: row.page || "",
    content: row.content,
    status: row.status,
    reply_message: row.reply_message || "",
    replied_by: row.replied_by || null,
    replied_by_username: row.replied_by_username || null,
    replied_at: row.replied_at || null,
    resolved_by: row.resolved_by,
    resolved_by_username: row.resolved_by_username || null,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
  };
}

export async function submitErrorReport(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    const body = await readJson(req);

    const title = cleanText(body.title, 120);
    const page = cleanText(body.page, 200);
    const content = cleanText(body.content, 2000);
    if (!title || !content) throw new HttpError(400, "title/content required");

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO error_reports(id, user_id, title, page, content, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    )
      .bind(id, user.user_id, title, page, content, nowIso())
      .run();

    return json({ ok: true, id }, 201, req, env);
  });
}

export async function myErrorReports(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    const rows = await env.DB.prepare(
      `SELECT e.*, u.username,
              resolver.username AS resolved_by_username,
              reply.message AS reply_message,
              reply.replied_by,
              replier.username AS replied_by_username,
              reply.replied_at
       FROM error_reports e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users resolver ON resolver.id = e.resolved_by
       LEFT JOIN error_report_replies reply ON reply.report_id = e.id
       LEFT JOIN users replier ON replier.id = reply.replied_by
       WHERE e.user_id = ?
       ORDER BY COALESCE(reply.updated_at, e.created_at) DESC, e.created_at DESC`,
    )
      .bind(user.user_id)
      .all();

    return json(
      { ok: true, items: (rows.results || []).map(toErrorReportResponse) },
      200,
      req,
      env,
    );
  });
}

export async function getErrorReports(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const status = new URL(req.url).searchParams.get("status") || "open";
    const filter = ["open", "resolved"].includes(status) ? status : "open";
    const rows = await env.DB.prepare(
      `SELECT e.*, u.username,
              resolver.username AS resolved_by_username,
              reply.message AS reply_message,
              reply.replied_by,
              replier.username AS replied_by_username,
              reply.replied_at
       FROM error_reports e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users resolver ON resolver.id = e.resolved_by
       LEFT JOIN error_report_replies reply ON reply.report_id = e.id
       LEFT JOIN users replier ON replier.id = reply.replied_by
       WHERE e.status = ?
       ORDER BY COALESCE(reply.updated_at, e.created_at) DESC, e.created_at DESC`,
    )
      .bind(filter)
      .all();

    return json(
      { ok: true, items: (rows.results || []).map(toErrorReportResponse) },
      200,
      req,
      env,
    );
  });
}

export async function replyErrorReport(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    const message = cleanText(body.message, 2000);
    if (!id) throw new HttpError(400, "id required");
    if (!message) throw new HttpError(400, "message required");

    const exists = await env.DB.prepare(
      "SELECT id FROM error_reports WHERE id = ?",
    )
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Error report not found");

    const timestamp = nowIso();
    await env.DB.prepare(
      `INSERT INTO error_report_replies(id, report_id, message, replied_by, replied_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_id) DO UPDATE SET
         message = excluded.message,
         replied_by = excluded.replied_by,
         replied_at = excluded.replied_at,
         updated_at = excluded.updated_at`,
    )
      .bind(
        crypto.randomUUID(),
        id,
        message,
        user.user_id,
        timestamp,
        timestamp,
        timestamp,
      )
      .run();

    return json({ ok: true }, 200, req, env);
  });
}

export async function resolveErrorReport(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare(
      "SELECT id FROM error_reports WHERE id = ?",
    )
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Error report not found");

    await env.DB.prepare(
      "UPDATE error_reports SET status = 'resolved', resolved_by = ?, resolved_at = ? WHERE id = ?",
    )
      .bind(user.user_id, nowIso(), id)
      .run();

    return json({ ok: true }, 200, req, env);
  });
}
