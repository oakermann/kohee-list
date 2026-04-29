import {
  HttpError,
  cleanText,
  json,
  nowIso,
  requireAuth,
  requireRole,
  withGuard,
} from "./shared.js";
import { normalizeCafePayload } from "./cafes.js";
import { safeWriteAuditLog } from "./security.js";

const REQUIRED_HEADERS = ["name", "address", "desc"];
const OPTIONAL_HEADERS = [
  "id",
  "lat",
  "lng",
  "signature",
  "beanShop",
  "instagram",
  "category",
  "status",
  "oakerman_pick",
  "manager_pick",
];
const ALLOWED_CATEGORIES = new Set([
  "espresso",
  "drip",
  "decaf",
  "instagram",
  "dessert",
]);
const ALLOWED_CAFE_STATUSES = new Set([
  "candidate",
  "approved",
  "hidden",
  "rejected",
]);

export function parseCsvLine(line) {
  const out = [];
  let current = "";
  let quote = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quote = !quote;
      }
      continue;
    }
    if (ch === "," && !quote) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  if (quote) {
    throw new HttpError(400, "Malformed CSV row", "VALIDATION_ERROR");
  }

  out.push(current);
  return out;
}

function boolCsv(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function splitCsvList(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function rowValue(cols, idx, name) {
  const i = idx[name];
  return Number.isInteger(i) ? cols[i] || "" : "";
}

function buildRowBody(cols, idx) {
  return {
    id: rowValue(cols, idx, "id"),
    name: rowValue(cols, idx, "name"),
    address: rowValue(cols, idx, "address"),
    desc: rowValue(cols, idx, "desc"),
    lat: Number(rowValue(cols, idx, "lat") || 0),
    lng: Number(rowValue(cols, idx, "lng") || 0),
    signature: splitCsvList(rowValue(cols, idx, "signature")),
    beanShop: rowValue(cols, idx, "beanShop"),
    instagram: rowValue(cols, idx, "instagram"),
    category: splitCsvList(rowValue(cols, idx, "category")),
    status: cleanText(rowValue(cols, idx, "status"), 40),
    oakerman_pick: boolCsv(rowValue(cols, idx, "oakerman_pick")),
    manager_pick: boolCsv(rowValue(cols, idx, "manager_pick")),
  };
}

function validateHeaders(headers) {
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const missing = REQUIRED_HEADERS.filter(
    (name) => !Number.isInteger(idx[name]),
  );
  if (missing.length) {
    throw new HttpError(
      400,
      `Missing required CSV headers: ${missing.join(", ")}`,
      "VALIDATION_ERROR",
    );
  }
  return idx;
}

function safeCsvErrorMessage(error) {
  if (error instanceof HttpError) return error.message;
  return "Invalid CSV row";
}

function validateRowShape(cols, headers) {
  if (cols.length !== headers.length) {
    throw new HttpError(
      400,
      "CSV row field count does not match headers",
      "VALIDATION_ERROR",
    );
  }
}

function validateRowBody(body) {
  if (!cleanText(body.name, 120)) {
    throw new HttpError(400, "name is required", "VALIDATION_ERROR");
  }
  if (!cleanText(body.address, 200)) {
    throw new HttpError(400, "address is required", "VALIDATION_ERROR");
  }
  if (!cleanText(body.desc, 2000)) {
    throw new HttpError(400, "desc is required", "VALIDATION_ERROR");
  }

  const invalidCategories = body.category.filter(
    (value) => !ALLOWED_CATEGORIES.has(value),
  );
  if (invalidCategories.length) {
    throw new HttpError(400, "Invalid category value", "VALIDATION_ERROR");
  }

  if (body.status && !ALLOWED_CAFE_STATUSES.has(body.status)) {
    throw new HttpError(400, "Invalid status value", "VALIDATION_ERROR");
  }
}

async function findDuplicateCafe(env, name, address) {
  return env.DB.prepare(
    `SELECT id, name, oakerman_pick, manager_pick
     FROM cafes
     WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(address)) = lower(trim(?))
     LIMIT 1`,
  )
    .bind(name, address)
    .first();
}

async function analyzeCsv(raw, env, user) {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2)
    throw new HttpError(400, "CSV is empty", "VALIDATION_ERROR");

  const headers = parseCsvLine(lines[0]).map((v) => v.trim());
  const idx = validateHeaders(headers);
  const rows = [];
  const duplicateRows = [];
  const failedRows = [];
  const previewRows = [];
  const stats = {
    total: lines.length - 1,
    wouldAdd: 0,
    wouldUpdate: 0,
    wouldDuplicate: 0,
    failed: 0,
  };

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    try {
      const cols = parseCsvLine(lines[i]);
      validateRowShape(cols, headers);
      const body = buildRowBody(cols, idx);
      validateRowBody(body);
      const givenId = cleanText(body.id, 80);
      let action = "add";
      let existing = null;

      if (givenId) {
        existing = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
          .bind(givenId)
          .first();
        if (existing) action = "update";
      }

      if (!existing) {
        existing = await findDuplicateCafe(env, body.name, body.address);
        if (existing) action = "duplicate";
      }

      const payload = normalizeCafePayload(body, user.role, existing || {});
      if (!payload.name || !payload.address || !payload.desc) {
        throw new Error("name/address/desc required");
      }

      if (action === "add") stats.wouldAdd += 1;
      if (action === "update") stats.wouldUpdate += 1;
      if (action === "duplicate") {
        stats.wouldUpdate += 1;
        stats.wouldDuplicate += 1;
        duplicateRows.push({
          row: rowNumber,
          id: existing.id,
          name: existing.name || payload.name,
        });
      }

      rows.push({ row: rowNumber, action, givenId, existing, payload });
      if (previewRows.length < 20) {
        previewRows.push({
          row: rowNumber,
          action,
          id: existing?.id || givenId || "",
          name: payload.name,
          address: payload.address,
        });
      }
    } catch (err) {
      stats.failed += 1;
      failedRows.push({ row: rowNumber, error: safeCsvErrorMessage(err) });
    }
  }

  return {
    headers: [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].filter((name) =>
      Number.isInteger(idx[name]),
    ),
    rows,
    duplicateRows,
    failedRows,
    previewRows,
    ...stats,
  };
}

function throwIfCsvValidationFailed(analysis) {
  if (analysis.failed > 0) {
    throw new HttpError(400, "CSV validation failed", "VALIDATION_ERROR");
  }
}

async function applyCsvRows(env, user, rows) {
  let added = 0;
  let updated = 0;
  let duplicated = 0;

  for (const row of rows) {
    const id = row.existing?.id || row.givenId || crypto.randomUUID();
    const timestamp = nowIso();

    if (row.action === "add") {
      await env.DB.prepare(
        `INSERT INTO cafes(
          id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
          oakerman_pick, manager_pick, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          row.payload.name,
          row.payload.address,
          row.payload.desc,
          row.payload.lat,
          row.payload.lng,
          row.payload.signature,
          row.payload.beanShop,
          row.payload.instagram,
          row.payload.category,
          row.payload.oakerman_pick,
          row.payload.manager_pick,
          user.user_id,
          timestamp,
        )
        .run();
      added += 1;
      continue;
    }

    await env.DB.prepare(
      `UPDATE cafes SET
        name = ?, address = ?, desc = ?, lat = ?, lng = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
        oakerman_pick = ?, manager_pick = ?, status = 'approved',
        deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        row.payload.name,
        row.payload.address,
        row.payload.desc,
        row.payload.lat,
        row.payload.lng,
        row.payload.signature,
        row.payload.beanShop,
        row.payload.instagram,
        row.payload.category,
        row.payload.oakerman_pick,
        row.payload.manager_pick,
        timestamp,
        id,
      )
      .run();
    updated += 1;
    if (row.action === "duplicate") duplicated += 1;
  }

  return { added, updated, duplicated };
}

async function applyCsvRowsOrThrow(env, user, rows) {
  try {
    return await applyCsvRows(env, user, rows);
  } catch {
    throw new HttpError(500, "CSV apply failed", "SERVER_ERROR");
  }
}

export async function importCsv(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
    const raw = await req.text();
    const analysis = await analyzeCsv(raw, env, user);

    if (dryRun) {
      return json({ ok: true, dryRun: true, ...analysis }, 200, req, env);
    }

    throwIfCsvValidationFailed(analysis);
    const applied = await applyCsvRowsOrThrow(env, user, analysis.rows);
    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "csv.import",
      targetType: "cafes",
      after: {
        actor_role: user.role,
        total: analysis.total,
        ...applied,
        failed: analysis.failed,
      },
    });

    return json(
      {
        ok: true,
        total: analysis.total,
        ...applied,
        duplicateRows: analysis.duplicateRows,
        failed: analysis.failed,
        failedRows: analysis.failedRows,
      },
      200,
      req,
      env,
    );
  });
}

export async function resetCsv(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const raw = await req.text();
    const analysis = await analyzeCsv(raw, env, user);
    throwIfCsvValidationFailed(analysis);

    let deleted = 0;
    let deletedAt = "";
    let applied = { added: 0, updated: 0, duplicated: 0 };
    try {
      const countRow = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM cafes WHERE deleted_at IS NULL",
      ).first();
      deleted = Number(countRow?.c || 0);
      deletedAt = nowIso();

      await env.DB.prepare(
        `UPDATE cafes
         SET deleted_at = ?, deleted_by = ?, updated_at = ?
         WHERE deleted_at IS NULL`,
      )
        .bind(deletedAt, user.user_id, deletedAt)
        .run();

      applied = await applyCsvRowsOrThrow(env, user, analysis.rows);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "CSV reset failed", "SERVER_ERROR");
    }
    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "csv.reset",
      targetType: "cafes",
      after: {
        actor_role: user.role,
        total: analysis.total,
        deleted,
        deleted_at: deletedAt,
        deleted_by: user.user_id,
        ...applied,
        failed: analysis.failed,
      },
    });

    return json(
      {
        ok: true,
        total: analysis.total,
        deleted,
        ...applied,
        duplicateRows: analysis.duplicateRows,
        failed: analysis.failed,
      },
      200,
      req,
      env,
    );
  });
}
