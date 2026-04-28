import {
  HttpError,
  cleanNumber,
  cleanText,
  cleanUrl,
  json,
  normalizeBool,
  nowIso,
  parseJsonArray,
  readJson,
  requireAuth,
  requireRole,
  text,
  withGuard,
} from "./shared.js";
import { safeWriteAuditLog } from "./security.js";

export function toCafeResponse(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    desc: row.desc,
    lat: Number(row.lat || 0),
    lng: Number(row.lng || 0),
    signature: parseJsonArray(row.signature),
    beanShop: cleanUrl(row.beanShop),
    instagram: cleanUrl(row.instagram),
    category: parseJsonArray(row.category),
    oakerman_pick: !!row.oakerman_pick,
    manager_pick: !!row.manager_pick,
    updated_at: row.updated_at,
  };
}

export async function getData(req, env) {
  return withGuard(req, env, async () => {
    const rows = await env.DB.prepare(
      `SELECT id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
        oakerman_pick, manager_pick, updated_at
       FROM cafes
       WHERE status = 'approved'
        AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
    ).all();
    const cafes = (rows.results || []).map(toCafeResponse);
    return json(cafes, 200, req, env);
  });
}

export async function getNotice(req, env) {
  return withGuard(req, env, async () => {
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'notice'",
    ).first();
    return text(row?.value || "", 200, req, env);
  });
}

export function applyPickPermission(role, payload, existing = {}) {
  if (role === "admin") {
    return {
      oakerman_pick: normalizeBool(payload.oakerman_pick),
      manager_pick: normalizeBool(payload.manager_pick),
    };
  }

  return {
    // Managers may manage manager_pick, but they must not overwrite oakerman_pick.
    oakerman_pick: normalizeBool(existing.oakerman_pick),
    manager_pick: normalizeBool(payload.manager_pick),
  };
}

export function normalizeCafePayload(payload, role, existing = {}) {
  const picks = applyPickPermission(role, payload, existing);
  return {
    name: cleanText(payload.name, 120),
    address: cleanText(payload.address, 200),
    desc: cleanText(payload.desc, 2000),
    lat: cleanNumber(payload.lat, 0),
    lng: cleanNumber(payload.lng, 0),
    signature: JSON.stringify(parseJsonArray(payload.signature)),
    beanShop: cleanUrl(payload.beanShop),
    instagram: cleanUrl(payload.instagram),
    category: JSON.stringify(parseJsonArray(payload.category)),
    oakerman_pick: picks.oakerman_pick,
    manager_pick: picks.manager_pick,
  };
}

export async function addCafe(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const body = await readJson(req);
    const payload = normalizeCafePayload(body, user.role);
    if (!payload.name || !payload.address || !payload.desc)
      throw new HttpError(400, "name/address/desc required");

    const id = crypto.randomUUID();
    const updatedAt = nowIso();
    await env.DB.prepare(
      `INSERT INTO cafes(
        id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
        oakerman_pick, manager_pick, created_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        payload.name,
        payload.address,
        payload.desc,
        payload.lat,
        payload.lng,
        payload.signature,
        payload.beanShop,
        payload.instagram,
        payload.category,
        payload.oakerman_pick,
        payload.manager_pick,
        user.user_id,
        updatedAt,
      )
      .run();

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "cafe.add",
      targetType: "cafe",
      targetId: id,
      after: {
        id,
        ...payload,
        created_by: user.user_id,
        updated_at: updatedAt,
      },
    });

    return json({ ok: true, id }, 201, req, env);
  });
}

export async function editCafe(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Cafe not found");

    const payload = normalizeCafePayload(body, user.role, exists);
    if (!payload.name || !payload.address || !payload.desc)
      throw new HttpError(400, "name/address/desc required");

    const updatedAt = nowIso();
    await env.DB.prepare(
      `UPDATE cafes SET
        name = ?, address = ?, desc = ?, lat = ?, lng = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
        oakerman_pick = ?, manager_pick = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        payload.name,
        payload.address,
        payload.desc,
        payload.lat,
        payload.lng,
        payload.signature,
        payload.beanShop,
        payload.instagram,
        payload.category,
        payload.oakerman_pick,
        payload.manager_pick,
        updatedAt,
        id,
      )
      .run();

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "cafe.edit",
      targetType: "cafe",
      targetId: id,
      before: exists,
      after: { id, ...payload, updated_at: updatedAt },
    });

    return json({ ok: true }, 200, req, env);
  });
}

export async function deleteCafe(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Cafe not found");

    await env.DB.prepare("DELETE FROM favorites WHERE cafe_id = ?")
      .bind(id)
      .run();
    await env.DB.prepare(
      "UPDATE submissions SET linked_cafe_id = NULL WHERE linked_cafe_id = ?",
    )
      .bind(id)
      .run();
    await env.DB.prepare("DELETE FROM cafes WHERE id = ?").bind(id).run();
    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "cafe.delete",
      targetType: "cafe",
      targetId: id,
      before: exists,
    });
    return json({ ok: true }, 200, req, env);
  });
}

export async function resetCsv(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const countRow = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM cafes",
    ).first();
    const deleted = Number(countRow?.c || 0);

    await env.DB.prepare(
      "DELETE FROM favorites WHERE cafe_id IN (SELECT id FROM cafes)",
    ).run();
    await env.DB.prepare(
      "UPDATE submissions SET linked_cafe_id = NULL WHERE linked_cafe_id IN (SELECT id FROM cafes)",
    ).run();
    await env.DB.prepare("DELETE FROM cafes").run();

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "csv.reset",
      targetType: "cafes",
      after: { deleted },
    });

    return json({ ok: true, deleted }, 200, req, env);
  });
}

export async function setNotice(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const before = await env.DB.prepare(
      "SELECT value, updated_at, updated_by FROM settings WHERE key = 'notice'",
    ).first();
    const value = cleanText(await req.text(), 500);
    const updatedAt = nowIso();
    await env.DB.prepare(
      "UPDATE settings SET value = ?, updated_at = ?, updated_by = ? WHERE key = 'notice'",
    )
      .bind(value, updatedAt, user.user_id)
      .run();

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "notice.update",
      targetType: "setting",
      targetId: "notice",
      before,
      after: { value, updated_at: updatedAt, updated_by: user.user_id },
    });

    return json({ ok: true }, 200, req, env);
  });
}
