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

export function toAdminCafeResponse(row) {
  return {
    ...toCafeResponse(row),
    status: row.status || "approved",
    deleted_at: row.deleted_at || null,
    hidden_at: row.hidden_at || null,
    hidden_by: row.hidden_by || null,
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

export async function listCafes(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const url = new URL(req.url);
    const lifecycle = String(url.searchParams.get("lifecycle") || "active");
    const where =
      lifecycle === "deleted"
        ? "WHERE deleted_at IS NOT NULL"
        : lifecycle === "all"
          ? ""
          : "WHERE deleted_at IS NULL";

    const rows = await env.DB.prepare(
      `SELECT id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
        oakerman_pick, manager_pick, updated_at, status, deleted_at, hidden_at, hidden_by
       FROM cafes
       ${where}
       ORDER BY updated_at DESC`,
    ).all();

    return json((rows.results || []).map(toAdminCafeResponse), 200, req, env);
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
    const status = "candidate";
    await env.DB.prepare(
      `INSERT INTO cafes(
        id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
        oakerman_pick, manager_pick, status, created_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        status,
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
        status,
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
    requireRole(user, ["admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Cafe not found");

    const deletedAt = nowIso();
    await env.DB.prepare(
      `UPDATE cafes
       SET deleted_at = ?, deleted_by = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(deletedAt, user.user_id, deletedAt, id)
      .run();
    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "cafe.delete",
      targetType: "cafe",
      targetId: id,
      before: exists,
      after: {
        id,
        actor_role: user.role,
        deleted_at: deletedAt,
        deleted_by: user.user_id,
      },
    });
    return json({ ok: true }, 200, req, env);
  });
}

export async function restoreCafe(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Cafe not found");

    const updatedAt = nowIso();
    await env.DB.prepare(
      `UPDATE cafes
       SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = ?
       WHERE id = ?`,
    )
      .bind(updatedAt, id)
      .run();

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "cafe.restore",
      targetType: "cafe",
      targetId: id,
      before: exists,
      after: {
        id,
        actor_role: user.role,
        deleted_at: null,
        deleted_by: null,
        delete_reason: null,
        updated_at: updatedAt,
      },
    });

    return json({ ok: true }, 200, req, env);
  });
}

export async function approveCafe(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Cafe not found");
    if (exists.deleted_at) {
      throw new HttpError(400, "Restore cafe before approval");
    }
    if (exists.status !== "candidate") {
      throw new HttpError(400, "Only candidate cafes can be approved");
    }

    const approvedAt = nowIso();
    await env.DB.prepare(
      `UPDATE cafes
       SET status = 'approved', approved_at = ?, approved_by = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(approvedAt, user.user_id, approvedAt, id)
      .run();

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "cafe.approve",
      targetType: "cafe",
      targetId: id,
      before: exists,
      after: {
        id,
        actor_role: user.role,
        status: "approved",
        approved_at: approvedAt,
        approved_by: user.user_id,
      },
    });

    return json({ ok: true }, 200, req, env);
  });
}

async function setCafeHoldStatus(req, env, fromStatus, toStatus) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const body = await readJson(req);
    const id = cleanText(body.id, 80);
    if (!id) throw new HttpError(400, "id required");

    const exists = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) throw new HttpError(404, "Cafe not found");
    if (exists.deleted_at) {
      throw new HttpError(400, "Restore cafe before status change");
    }
    if (exists.status !== fromStatus) {
      throw new HttpError(400, `Only ${fromStatus} cafes can be updated`);
    }

    const updatedAt = nowIso();
    if (toStatus === "hidden") {
      await env.DB.prepare(
        `UPDATE cafes
         SET status = 'hidden', hidden_at = ?, hidden_by = ?, updated_at = ?
         WHERE id = ?`,
      )
        .bind(updatedAt, user.user_id, updatedAt, id)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE cafes
         SET status = 'candidate', hidden_at = NULL, hidden_by = NULL, updated_at = ?
         WHERE id = ?`,
      )
        .bind(updatedAt, id)
        .run();
    }

    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: toStatus === "hidden" ? "cafe.hold" : "cafe.unhold",
      targetType: "cafe",
      targetId: id,
      before: exists,
      after: {
        id,
        actor_role: user.role,
        status: toStatus,
        hidden_at: toStatus === "hidden" ? updatedAt : null,
        hidden_by: toStatus === "hidden" ? user.user_id : null,
      },
    });

    return json({ ok: true }, 200, req, env);
  });
}

export async function holdCafe(req, env) {
  return setCafeHoldStatus(req, env, "candidate", "hidden");
}

export async function unholdCafe(req, env) {
  return setCafeHoldStatus(req, env, "hidden", "candidate");
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
