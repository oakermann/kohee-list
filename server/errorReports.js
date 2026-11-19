// 오류 제보 — 로그인 없이 받고, 제보자는 브라우저 표(client_id)로 답변을 본다.
import {
  HttpError,
  cleanClientId,
  cleanText,
  json,
  nowIso,
  readJson,
} from "./shared.js";
import { assertUnderDailyCap } from "./cafes.js";

const COLUMNS =
  "id, title, page, content, status, reply, replied_at, resolved_at, created_at";

export async function submitErrorReport(req, env) {
  const body = await readJson(req);
  const clientId = cleanClientId(body.client_id);
  const title = cleanText(body.title, 120);
  const content = cleanText(body.content, 2000);
  if (!title || !content) throw new HttpError(400, "title, content required");
  await assertUnderDailyCap(env, "error_reports");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO error_reports (id, client_id, title, page, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, clientId, title, cleanText(body.page, 200), content, nowIso())
    .run();
  return json({ ok: true, id }, 201);
}

export async function myErrorReports(req, env) {
  const clientId = cleanClientId(
    new URL(req.url).searchParams.get("client_id"),
  );
  const rows = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM error_reports WHERE client_id = ? ORDER BY created_at DESC`,
  )
    .bind(clientId)
    .all();
  return json({ ok: true, items: rows.results });
}

export async function listErrorReports(_req, env) {
  const rows = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM error_reports WHERE status = 'open' ORDER BY created_at DESC`,
  ).all();
  return json({ ok: true, items: rows.results });
}

async function updateReport(env, id, sql, ...values) {
  const result = await env.DB.prepare(sql)
    .bind(...values, cleanText(id, 80))
    .run();
  if (!result.meta?.changes) throw new HttpError(404, "Error report not found");
  return json({ ok: true });
}

export async function replyErrorReport(req, env) {
  const body = await readJson(req);
  const reply = cleanText(body.message, 2000);
  if (!reply) throw new HttpError(400, "message required");
  return updateReport(
    env,
    body.id,
    "UPDATE error_reports SET reply = ?, replied_at = ? WHERE id = ?",
    reply,
    nowIso(),
  );
}

export async function resolveErrorReport(req, env) {
  const body = await readJson(req);
  return updateReport(
    env,
    body.id,
    "UPDATE error_reports SET status = 'resolved', resolved_at = ? WHERE id = ?",
    nowIso(),
  );
}
