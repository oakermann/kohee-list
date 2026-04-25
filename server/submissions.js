import {
  HttpError,
  cleanText,
  cleanUrl,
  json,
  nowIso,
  parseJsonArray,
  readJson,
  requireAuth,
  requireRole,
  withGuard,
} from "./shared.js";
import { normalizeCafePayload } from "./cafes.js";

export function toSubmissionResponse(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    name: row.name,
    address: row.address,
    desc: row.desc,
    reason: row.reason || "",
    signature: parseJsonArray(row.signature),
    beanShop: cleanUrl(row.beanShop),
    instagram: cleanUrl(row.instagram),
    category: parseJsonArray(row.category),
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_by_username: row.reviewed_by_username || null,
    reviewed_at: row.reviewed_at,
    reject_reason: row.reject_reason,
    linked_cafe_id: row.linked_cafe_id,
    oakerman_pick: !!row.oakerman_pick,
    manager_pick: !!row.manager_pick,
    created_at: row.created_at,
  };
}

export async function submitCafe(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    const body = await readJson(req);

    const name = cleanText(body.name, 120);
    const address = cleanText(body.address, 200);
    const desc = cleanText(body.desc, 2000);
    if (!name || !address || !desc)
      throw new HttpError(400, "name, address, desc required");

    const item = {
      id: crypto.randomUUID(),
      user_id: user.user_id,
      name,
      address,
      desc,
      reason: cleanText(body.reason, 1000),
      signature: JSON.stringify(parseJsonArray(body.signature)),
      beanShop: cleanUrl(body.beanShop),
      instagram: cleanUrl(body.instagram),
      category: JSON.stringify(parseJsonArray(body.category)),
      created_at: nowIso(),
    };

    await env.DB.prepare(
      `INSERT INTO submissions(
        id, user_id, name, address, desc, reason, signature, beanShop, instagram, status, category, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
      .bind(
        item.id,
        item.user_id,
        item.name,
        item.address,
        item.desc,
        item.reason,
        item.signature,
        item.beanShop,
        item.instagram,
        item.category,
        item.created_at,
      )
      .run();

    return json({ ok: true, submission_id: item.id }, 201, req, env);
  });
}

export async function mySubmissions(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    const rows = await env.DB.prepare(
      `SELECT s.*, reviewer.username AS reviewed_by_username
       FROM submissions s
       LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
    )
      .bind(user.user_id)
      .all();

    return json(
      { ok: true, items: (rows.results || []).map(toSubmissionResponse) },
      200,
      req,
      env,
    );
  });
}

export async function getSubmissions(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const status = new URL(req.url).searchParams.get("status") || "pending";
    const filter = ["pending", "approved", "rejected"].includes(status)
      ? status
      : "pending";

    if (user.role === "manager" && filter !== "pending") {
      const rows = await env.DB.prepare(
        `SELECT s.*, u.username, reviewer.username AS reviewed_by_username
         FROM submissions s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
         WHERE s.status = ? AND s.reviewed_by = ?
         ORDER BY COALESCE(s.reviewed_at, s.created_at) DESC`,
      )
        .bind(filter, user.user_id)
        .all();

      return json(
        { ok: true, items: (rows.results || []).map(toSubmissionResponse) },
        200,
        req,
        env,
      );
    }

    const rows = await env.DB.prepare(
      `SELECT s.*, u.username, reviewer.username AS reviewed_by_username
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
       WHERE s.status = ?
       ORDER BY COALESCE(s.reviewed_at, s.created_at) DESC`,
    )
      .bind(filter)
      .all();

    return json(
      { ok: true, items: (rows.results || []).map(toSubmissionResponse) },
      200,
      req,
      env,
    );
  });
}

export async function approveSubmission(req, env) {
  return withGuard(req, env, async () => {
    const reviewer = await requireAuth(req, env);
    requireRole(reviewer, ["manager", "admin"]);

    const body = await readJson(req);
    const submissionId = cleanText(body.submissionId, 80);
    if (!submissionId) throw new HttpError(400, "submissionId required");

    const sub = await env.DB.prepare("SELECT * FROM submissions WHERE id = ?")
      .bind(submissionId)
      .first();
    if (!sub) throw new HttpError(404, "Submission not found");
    if (sub.status !== "pending")
      throw new HttpError(409, "Submission already reviewed");

    let linkedCafeId = cleanText(body.linkedCafeId, 80);
    const isDuplicate = body.duplicate ? 1 : 0;

    if (isDuplicate) {
      if (!linkedCafeId)
        throw new HttpError(
          400,
          "linkedCafeId required for duplicate approval",
        );
      const existingCafe = await env.DB.prepare(
        "SELECT id FROM cafes WHERE id = ?",
      )
        .bind(linkedCafeId)
        .first();
      if (!existingCafe) throw new HttpError(404, "Linked cafe not found");
    } else {
      const merged = normalizeCafePayload(
        {
          name: body.name ?? sub.name,
          address: body.address ?? sub.address,
          desc: body.desc ?? sub.desc,
          lat: body.lat ?? 0,
          lng: body.lng ?? 0,
          signature: body.signature ?? parseJsonArray(sub.signature),
          beanShop: body.beanShop ?? sub.beanShop,
          instagram: body.instagram ?? sub.instagram,
          category: body.category ?? parseJsonArray(sub.category),
          oakerman_pick: body.oakerman_pick,
          manager_pick: body.manager_pick,
        },
        reviewer.role,
        sub,
      );

      if (!merged.name || !merged.address || !merged.desc) {
        throw new HttpError(400, "name, address, desc required for approval");
      }

      linkedCafeId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO cafes(
          id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
          oakerman_pick, manager_pick, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          linkedCafeId,
          merged.name,
          merged.address,
          merged.desc,
          merged.lat,
          merged.lng,
          merged.signature,
          merged.beanShop,
          merged.instagram,
          merged.category,
          merged.oakerman_pick,
          merged.manager_pick,
          reviewer.user_id,
          nowIso(),
        )
        .run();
    }

    await env.DB.prepare(
      `UPDATE submissions
       SET status = 'approved', reviewed_by = ?, reviewed_at = ?, linked_cafe_id = ?, reject_reason = NULL
       WHERE id = ?`,
    )
      .bind(reviewer.user_id, nowIso(), linkedCafeId || null, submissionId)
      .run();

    return json(
      { ok: true, linked_cafe_id: linkedCafeId || null },
      200,
      req,
      env,
    );
  });
}

export async function rejectSubmission(req, env) {
  return withGuard(req, env, async () => {
    const reviewer = await requireAuth(req, env);
    requireRole(reviewer, ["manager", "admin"]);

    const body = await readJson(req);
    const submissionId = cleanText(body.submissionId, 80);
    const rejectReason = cleanText(body.reject_reason, 500);
    if (!submissionId) throw new HttpError(400, "submissionId required");

    const sub = await env.DB.prepare(
      "SELECT status FROM submissions WHERE id = ?",
    )
      .bind(submissionId)
      .first();
    if (!sub) throw new HttpError(404, "Submission not found");
    if (sub.status !== "pending")
      throw new HttpError(409, "Submission already reviewed");

    await env.DB.prepare(
      `UPDATE submissions
       SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reject_reason = ?
       WHERE id = ?`,
    )
      .bind(reviewer.user_id, nowIso(), rejectReason || null, submissionId)
      .run();

    return json({ ok: true }, 200, req, env);
  });
}

export async function updateSubmission(req, env) {
  return withGuard(req, env, async () => {
    const reviewer = await requireAuth(req, env);
    requireRole(reviewer, ["manager", "admin"]);

    const body = await readJson(req);
    const submissionId = cleanText(body.id, 80);
    if (!submissionId) throw new HttpError(400, "id required");

    const existing = await env.DB.prepare(
      "SELECT status, oakerman_pick, manager_pick FROM submissions WHERE id = ?",
    )
      .bind(submissionId)
      .first();
    if (!existing) throw new HttpError(404, "Submission not found");
    if (existing.status !== "pending")
      throw new HttpError(409, "Only pending can be updated");

    const payload = normalizeCafePayload(body, reviewer.role, existing);
    if (!payload.name || !payload.address || !payload.desc)
      throw new HttpError(400, "name/address/desc required");

    await env.DB.prepare(
      `UPDATE submissions SET
        name = ?, address = ?, desc = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
        oakerman_pick = ?, manager_pick = ?
       WHERE id = ?`,
    )
      .bind(
        payload.name,
        payload.address,
        payload.desc,
        payload.signature,
        payload.beanShop,
        payload.instagram,
        payload.category,
        payload.oakerman_pick,
        payload.manager_pick,
        submissionId,
      )
      .run();

    return json({ ok: true }, 200, req, env);
  });
}
