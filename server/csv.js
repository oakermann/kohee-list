import {
  HttpError,
  cleanText,
  json,
  nowIso,
  responseHeaders,
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
const DEFAULT_IMPORTED_CAFE_STATUS = "candidate";
const RESET_ROLLBACK_CAFE_COLUMNS =
  "id, name, address, desc, lat, lng, signature, beanShop, instagram, category, oakerman_pick, manager_pick, status, hidden_at, hidden_by, deleted_at, deleted_by, delete_reason, updated_at";

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
    `SELECT ${RESET_ROLLBACK_CAFE_COLUMNS}
     FROM cafes
     WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(address)) = lower(trim(?))
     LIMIT 1`,
  )
    .bind(name, address)
    .first();
}

function resolveCsvCafeStatus(csvStatus) {
  if (csvStatus === "hidden") return "hidden";
  return DEFAULT_IMPORTED_CAFE_STATUS;
}

function csvHoldFields(status, timestamp, user) {
  return status === "hidden"
    ? { hidden_at: timestamp, hidden_by: user.user_id }
    : { hidden_at: null, hidden_by: null };
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
      const status = resolveCsvCafeStatus(body.status);

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

      rows.push({
        row: rowNumber,
        action,
        givenId,
        existing,
        payload,
        status,
      });
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
    row.appliedId = id;
    const timestamp = nowIso();

    if (row.action === "add") {
      const holdFields = csvHoldFields(row.status, timestamp, user);
      await env.DB.prepare(
        `INSERT INTO cafes(
          id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
          oakerman_pick, manager_pick, status, hidden_at, hidden_by, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          row.status,
          holdFields.hidden_at,
          holdFields.hidden_by,
          user.user_id,
          timestamp,
        )
        .run();
      added += 1;
      continue;
    }

    const holdFields = csvHoldFields(row.status, timestamp, user);
    await env.DB.prepare(
      `UPDATE cafes SET
        name = ?, address = ?, desc = ?, lat = ?, lng = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
        oakerman_pick = ?, manager_pick = ?, status = ?, hidden_at = ?, hidden_by = ?,
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
        row.status,
        holdFields.hidden_at,
        holdFields.hidden_by,
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

function resetSnapshotFromCafe(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    desc: row.desc,
    lat: row.lat,
    lng: row.lng,
    signature: row.signature,
    beanShop: row.beanShop,
    instagram: row.instagram,
    category: row.category,
    oakerman_pick: row.oakerman_pick,
    manager_pick: row.manager_pick,
    status: row.status,
    hidden_at: row.hidden_at,
    hidden_by: row.hidden_by,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    delete_reason: row.delete_reason,
    updated_at: row.updated_at,
  };
}

async function snapshotActiveCafeResetState(env) {
  const rows = await env.DB.prepare(
    `SELECT ${RESET_ROLLBACK_CAFE_COLUMNS}
     FROM cafes
     WHERE deleted_at IS NULL`,
  ).all();
  return (rows.results || []).map(resetSnapshotFromCafe).filter(Boolean);
}

function resetRollbackSnapshots(activeSnapshots, rows) {
  const snapshots = new Map();
  for (const snapshot of activeSnapshots) snapshots.set(snapshot.id, snapshot);
  for (const row of rows) {
    const snapshot = resetSnapshotFromCafe(row.existing);
    if (snapshot) snapshots.set(snapshot.id, snapshot);
  }
  return [...snapshots.values()];
}

async function rollbackResetCsv(env, user, rows, snapshots) {
  const rolledBackAt = nowIso();
  for (const snapshot of snapshots) {
    await env.DB.prepare(
      `UPDATE cafes
       SET name = ?, address = ?, desc = ?, lat = ?, lng = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
        oakerman_pick = ?, manager_pick = ?, status = ?, hidden_at = ?, hidden_by = ?,
        deleted_at = ?, deleted_by = ?, delete_reason = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        snapshot.name,
        snapshot.address,
        snapshot.desc,
        snapshot.lat,
        snapshot.lng,
        snapshot.signature,
        snapshot.beanShop,
        snapshot.instagram,
        snapshot.category,
        snapshot.oakerman_pick,
        snapshot.manager_pick,
        snapshot.status,
        snapshot.hidden_at,
        snapshot.hidden_by,
        snapshot.deleted_at,
        snapshot.deleted_by,
        snapshot.delete_reason,
        snapshot.updated_at,
        snapshot.id,
      )
      .run();
  }

  for (const row of rows) {
    if (row.action !== "add" || !row.appliedId) continue;
    await env.DB.prepare(
      `UPDATE cafes
       SET deleted_at = ?, deleted_by = ?, updated_at = ?
       WHERE id = ? AND created_by = ?`,
    )
      .bind(
        rolledBackAt,
        user.user_id,
        rolledBackAt,
        row.appliedId,
        user.user_id,
      )
      .run();
  }
}

const REVIEW_EXPORT_COLUMNS = [
  "cafe_id",
  "name",
  "address",
  "desc",
  "lat",
  "lng",
  "category",
  "signature",
  "beanShop",
  "instagram",
  "oakerman_pick",
  "manager_pick",
  "status",
  "updated_at",
];

const HOLD_REVIEW_EXPORT_COLUMNS = [
  ...REVIEW_EXPORT_COLUMNS,
  "hidden_at",
  "hidden_by",
];

const SUBMISSION_REVIEW_EXPORT_COLUMNS = [
  "submission_id",
  "submitted_at",
  "submitter_name",
  "submitter_contact",
  "submitted_cafe_name",
  "submitted_address",
  "submitted_naver_map_url",
  "submitted_reason",
  "submitted_recommended_menu",
  "submitted_tags",
  "submission_status",
  "linked_cafe_id",
  "converted_status",
  "admin_reply_status",
  "admin_reply_message",
  "internal_note",
  "review_decision",
  "recommended_status",
  "review_memo",
  "hold_reason",
  "admin_check_required",
  "duplicate_status",
  "duplicate_with",
  "duplicate_reason",
  "normalized_name_suggested",
  "normalized_address_suggested",
  "normalized_naver_map_url_suggested",
  "tags_suggested",
  "recommended_menu_suggested",
  "description_suggested",
  "conversion_recommendation",
  "public_leak_risk",
];

function csvEscape(value) {
  const textValue = String(value ?? "");
  if (!/[",\n\r]/.test(textValue)) return textValue;
  return `"${textValue.replace(/"/g, '""')}"`;
}

function csvReviewCell(value) {
  const textValue = String(value ?? "");
  return /^[=+\-@]/.test(textValue) ? `'${textValue}` : textValue;
}

function toSubmissionReviewRow(row) {
  const submittedTags = [row.category, row.signature]
    .filter(Boolean)
    .join(" | ");

  return {
    submission_id: row.id || "",
    submitted_at: row.created_at || "",
    submitter_name: row.username || "",
    submitter_contact: "",
    submitted_cafe_name: csvReviewCell(row.name),
    submitted_address: csvReviewCell(row.address),
    submitted_naver_map_url: "",
    submitted_reason: csvReviewCell(row.reason),
    submitted_recommended_menu: "",
    submitted_tags: csvReviewCell(submittedTags),
    submission_status: row.status || "",
    linked_cafe_id: row.linked_cafe_id || "",
    converted_status: row.linked_cafe_id ? "linked" : "",
    admin_reply_status: row.reviewed_at ? "reviewed" : "pending",
    admin_reply_message: csvReviewCell(row.reject_reason),
    internal_note: "",
    review_decision: "",
    recommended_status: "",
    review_memo: "",
    hold_reason: "",
    admin_check_required: "yes",
    duplicate_status: "",
    duplicate_with: "",
    duplicate_reason: "",
    normalized_name_suggested: "",
    normalized_address_suggested: "",
    normalized_naver_map_url_suggested: "",
    tags_suggested: "",
    recommended_menu_suggested: "",
    description_suggested: csvReviewCell(row.desc),
    conversion_recommendation: "",
    public_leak_risk: "admin_review_required",
  };
}

function toCsvBody(columns, rows) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvResponse(req, env, filename, body) {
  return new Response(body, {
    status: 200,
    headers: responseHeaders(req, env, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    }),
  });
}

async function exportReviewCsv(req, env, options) {
  const user = await requireAuth(req, env);
  requireRole(user, ["admin"]);

  const rowsResult = await env.DB.prepare(options.sql).all();
  const rows = (rowsResult?.results || []).map((row) => {
    if (options.mapRow) return options.mapRow(row);
    return {
      ...row,
      cafe_id: row.id || "",
      submission_id: row.id || "",
      category: row.category || "",
      signature: row.signature || "",
    };
  });

  return csvResponse(
    req,
    env,
    options.filename,
    toCsvBody(options.columns, rows),
  );
}

export async function exportCandidatesReviewCsv(req, env) {
  return withGuard(req, env, async () =>
    exportReviewCsv(req, env, {
      filename: "candidates-review.csv",
      columns: REVIEW_EXPORT_COLUMNS,
      sql: `SELECT
              id, name, address, desc, lat, lng, category, signature, beanShop, instagram,
              oakerman_pick, manager_pick, status, updated_at
            FROM cafes
            WHERE status = 'candidate' AND deleted_at IS NULL
            ORDER BY updated_at DESC, id ASC`,
    }),
  );
}

export async function exportHoldReviewCsv(req, env) {
  return withGuard(req, env, async () =>
    exportReviewCsv(req, env, {
      filename: "hold-review.csv",
      columns: HOLD_REVIEW_EXPORT_COLUMNS,
      sql: `SELECT
              id, name, address, desc, lat, lng, category, signature, beanShop, instagram,
              oakerman_pick, manager_pick, status, updated_at, hidden_at, hidden_by
            FROM cafes
            WHERE status = 'hidden' AND deleted_at IS NULL AND hidden_at IS NOT NULL
            ORDER BY hidden_at DESC, updated_at DESC, id ASC`,
    }),
  );
}

export async function exportApprovedReviewCsv(req, env) {
  return withGuard(req, env, async () =>
    exportReviewCsv(req, env, {
      filename: "approved-review.csv",
      columns: REVIEW_EXPORT_COLUMNS,
      sql: `SELECT
              id, name, address, desc, lat, lng, category, signature, beanShop, instagram,
              oakerman_pick, manager_pick, status, updated_at
            FROM cafes
            WHERE status = 'approved' AND deleted_at IS NULL
            ORDER BY updated_at DESC, id ASC`,
    }),
  );
}

export async function exportSubmissionsReviewCsv(req, env) {
  return withGuard(req, env, async () =>
    exportReviewCsv(req, env, {
      filename: "user_submissions_review_export.csv",
      columns: SUBMISSION_REVIEW_EXPORT_COLUMNS,
      mapRow: toSubmissionReviewRow,
      sql: `SELECT
              s.id, s.user_id, u.username, s.name, s.address, s.desc, s.reason,
              s.category, s.signature, s.beanShop, s.instagram,
              s.oakerman_pick, s.manager_pick, s.status, s.created_at,
              s.reviewed_at, s.reviewed_by, reviewer.username AS reviewed_by_username,
              s.reject_reason, s.linked_cafe_id
            FROM submissions s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
            WHERE s.status = 'pending'
            ORDER BY s.created_at DESC, s.id ASC`,
    }),
  );
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
    let rollbackSnapshots = [];
    try {
      const activeSnapshots = await snapshotActiveCafeResetState(env);
      rollbackSnapshots = resetRollbackSnapshots(
        activeSnapshots,
        analysis.rows,
      );

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
    } catch {
      try {
        if (rollbackSnapshots.length) {
          await rollbackResetCsv(env, user, analysis.rows, rollbackSnapshots);
        }
      } catch {}
      return json(
        { ok: false, error: "CSV reset failed", code: "SERVER_ERROR" },
        500,
        req,
        env,
      );
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
