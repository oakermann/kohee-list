import {
  HttpError,
  cleanText,
  getClientIpHash,
  nowIso,
  sha256Hex,
} from "./shared.js";

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export async function rateLimitKey(req, env, prefix, parts = []) {
  const ipHash = await getClientIpHash(req, env);
  const safeParts = parts.map((part) => cleanText(part, 120).toLowerCase());
  return [prefix, ipHash, ...safeParts].join(":");
}

async function getLimitRow(env, key) {
  return env.DB.prepare(
    "SELECT key, count, reset_at FROM rate_limits WHERE key = ?",
  )
    .bind(key)
    .first();
}

async function clearExpiredLimit(env, key, row) {
  if (!row) return true;
  if (new Date(row.reset_at).getTime() > Date.now()) return false;
  await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
  return true;
}

export async function assertRateLimitOpen(env, key, limit) {
  const row = await getLimitRow(env, key);
  const expired = await clearExpiredLimit(env, key, row);
  if (expired || !row) return;
  if (Number(row.count) >= limit) {
    throw new HttpError(
      429,
      "Too many attempts. Try again later.",
      "RATE_LIMITED",
    );
  }
}

export async function recordRateLimitFailure(env, key, windowMinutes) {
  const row = await getLimitRow(env, key);
  const resetAt = minutesFromNow(windowMinutes);
  const expired = await clearExpiredLimit(env, key, row);

  if (expired || !row) {
    await env.DB.prepare(
      `INSERT INTO rate_limits (key, count, reset_at, updated_at)
       VALUES (?, 1, ?, ?)`,
    )
      .bind(key, resetAt, nowIso())
      .run();
    return;
  }

  await env.DB.prepare(
    `UPDATE rate_limits
     SET count = count + 1, updated_at = ?
     WHERE key = ?`,
  )
    .bind(nowIso(), key)
    .run();
}

export async function clearRateLimit(env, key) {
  await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}

export async function consumeRateLimit(env, key, limit, windowMinutes) {
  await assertRateLimitOpen(env, key, limit);
  await recordRateLimitFailure(env, key, windowMinutes);
}

function scrubAuditValue(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrubAuditValue);

  const blocked = new Set([
    "password",
    "password_hash",
    "token",
    "token_hash",
    "csrf_token",
    "csrf_token_hash",
  ]);
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (blocked.has(key)) continue;
    output[key] = scrubAuditValue(item);
  }
  return output;
}

function auditJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(scrubAuditValue(value));
}

export async function writeAuditLog(env, input) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO audit_logs
       (id, actor_user_id, action, target_type, target_id, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.actorUserId || null,
      input.action,
      input.targetType,
      input.targetId || null,
      auditJson(input.before),
      auditJson(input.after),
      nowIso(),
    )
    .run();
  return id;
}

export async function hashForStorage(value, salt) {
  return sha256Hex(`${value || ""}:${salt || ""}`);
}
