// 카페 한 표에 공개·후보·제보가 다 산다.
//   공개 = status 'approved' AND deleted_at IS NULL  (사이트에 보이는 유일한 조건)
//   후보 = status 'candidate' — 어드민 등록·CSV·사용자 제보(client_id 있음)
//   내림 = deleted_at 있음 — 버린 제보·내린 카페. 되살리면 원래 상태로.
import {
  HttpError,
  cleanClientId,
  cleanNumber,
  cleanText,
  cleanUrl,
  json,
  nowIso,
  parseJsonArray,
  readJson,
  text,
} from "./shared.js";

export const CATEGORIES = ["espresso", "drip", "decaf", "instagram", "dessert"];
// 로그인이 없으니 도배는 사이트 전체 하루 상한으로 막는다 — 제보는 어차피 어드민이 공개해야 보인다.
export const SUBMIT_DAILY_CAP = 30;

const PUBLIC_COLUMNS =
  "id, name, address, desc, lat, lng, signature, beanShop, instagram, naver_url, region, region_distance_m, category, oakerman_pick, updated_at";

function toPublicCafe(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    desc: row.desc,
    lat: Number(row.lat),
    lng: Number(row.lng),
    signature: parseJsonArray(row.signature),
    beanShop: row.beanShop,
    instagram: row.instagram,
    naver_url: row.naver_url,
    region: row.region,
    region_distance_m: Number(row.region_distance_m),
    category: parseJsonArray(row.category),
    oakerman_pick: !!row.oakerman_pick,
    updated_at: row.updated_at,
  };
}

function toAdminCafe(row) {
  return {
    ...toPublicCafe(row),
    memo: row.memo,
    status: row.status,
    deleted_at: row.deleted_at,
    submitted: !!row.client_id,
    reason: row.reason,
    reject_reason: row.reject_reason,
    created_at: row.created_at,
  };
}

export function parseCategories(value) {
  const categories = parseJsonArray(value);
  if (categories.some((category) => !CATEGORIES.includes(category))) {
    throw new HttpError(400, "Invalid category value");
  }
  return categories;
}

// 좌표 0 인 카페는 '내 주변'에서 조용히 빠진다 — 공개 전에 막는다.
export function hasValidCoords({ lat, lng }) {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    Number.isFinite(la) &&
    Number.isFinite(lo) &&
    la !== 0 &&
    lo !== 0 &&
    Math.abs(la) <= 90 &&
    Math.abs(lo) <= 180
  );
}

export function normalizeCafe(body) {
  const cafe = {
    name: cleanText(body.name, 120),
    address: cleanText(body.address, 200),
    desc: cleanText(body.desc, 2000),
    lat: cleanNumber(body.lat),
    lng: cleanNumber(body.lng),
    signature: JSON.stringify(parseJsonArray(body.signature)),
    beanShop: cleanUrl(body.beanShop),
    instagram: cleanUrl(body.instagram),
    naver_url: cleanUrl(body.naver_url),
    region: cleanText(body.region, 80),
    region_distance_m: cleanNumber(body.region_distance_m),
    memo: cleanText(body.memo, 500),
    category: JSON.stringify(parseCategories(body.category)),
    oakerman_pick: body.oakerman_pick ? 1 : 0,
  };
  if (!cafe.name || !cafe.address || !cafe.desc) {
    throw new HttpError(400, "name, address, desc required");
  }
  return cafe;
}

const CAFE_FIELDS = [
  "name",
  "address",
  "desc",
  "lat",
  "lng",
  "signature",
  "beanShop",
  "instagram",
  "naver_url",
  "region",
  "region_distance_m",
  "memo",
  "category",
  "oakerman_pick",
];

export function insertCafeStatement(env, cafe, extra = {}) {
  const timestamp = nowIso();
  const row = {
    id: crypto.randomUUID(),
    ...cafe,
    status: "candidate",
    client_id: null,
    reason: "",
    created_at: timestamp,
    updated_at: timestamp,
    ...extra,
  };
  const columns = Object.keys(row);
  return {
    id: row.id,
    statement: env.DB.prepare(
      `INSERT INTO cafes (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    ).bind(...columns.map((column) => row[column])),
  };
}

async function findCafe(env, id) {
  const cafe = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
    .bind(cleanText(id, 80))
    .first();
  if (!cafe) throw new HttpError(404, "Cafe not found");
  return cafe;
}

// ---- 공개 ----

export async function getData(_req, env) {
  const rows = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM cafes
     WHERE status = 'approved' AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
  ).all();
  return json(rows.results.map(toPublicCafe), 200, { cache: true });
}

export async function getNotice(_req, env) {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'notice'",
  ).first();
  return text(row?.value || "");
}

export async function assertUnderDailyCap(env, table) {
  const since = new Date(Date.now() - 86400 * 1000).toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ${table} WHERE client_id IS NOT NULL AND created_at > ?`,
  )
    .bind(since)
    .first();
  if (Number(row.n) >= SUBMIT_DAILY_CAP) {
    throw new HttpError(
      429,
      "Too many submissions today. Try again tomorrow.",
      "RATE_LIMITED",
    );
  }
}

export async function submitCafe(req, env) {
  const body = await readJson(req);
  const clientId = cleanClientId(body.client_id);
  const cafe = normalizeCafe({
    name: body.name,
    address: body.address,
    desc: body.desc,
    category: body.category,
  });
  await assertUnderDailyCap(env, "cafes");
  const { id, statement } = insertCafeStatement(env, cafe, {
    client_id: clientId,
    reason: cleanText(body.reason, 1000),
  });
  await statement.run();
  return json({ ok: true, id }, 201);
}

export async function mySubmissions(req, env) {
  const clientId = cleanClientId(
    new URL(req.url).searchParams.get("client_id"),
  );
  const rows = await env.DB.prepare(
    `SELECT id, name, address, status, deleted_at, reject_reason, created_at
     FROM cafes WHERE client_id = ? ORDER BY created_at DESC`,
  )
    .bind(clientId)
    .all();
  const items = rows.results.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    state: row.deleted_at
      ? "declined"
      : row.status === "approved"
        ? "published"
        : "reviewing",
    reject_reason: row.deleted_at ? row.reject_reason : "",
    created_at: row.created_at,
  }));
  return json({ ok: true, items });
}

// ---- 어드민 ----

export async function listCafes(_req, env) {
  const rows = await env.DB.prepare(
    "SELECT * FROM cafes ORDER BY updated_at DESC",
  ).all();
  return json(rows.results.map(toAdminCafe));
}

export async function addCafe(req, env) {
  const { id, statement } = insertCafeStatement(
    env,
    normalizeCafe(await readJson(req)),
  );
  await statement.run();
  return json({ ok: true, id }, 201);
}

export async function editCafe(req, env) {
  const body = await readJson(req);
  const existing = await findCafe(env, body.id);
  const cafe = normalizeCafe(body);
  if (existing.status === "approved" && !hasValidCoords(cafe)) {
    throw new HttpError(
      400,
      "Cafe coordinates (lat/lng) are required",
      "COORDS_REQUIRED",
    );
  }
  await env.DB.prepare(
    `UPDATE cafes SET ${CAFE_FIELDS.map((f) => `${f} = ?`).join(", ")}, updated_at = ?
     WHERE id = ?`,
  )
    .bind(...CAFE_FIELDS.map((f) => cafe[f]), nowIso(), existing.id)
    .run();
  return json({ ok: true });
}

export async function publishCafe(req, env) {
  const cafe = await findCafe(env, (await readJson(req)).id);
  if (cafe.deleted_at)
    throw new HttpError(400, "Restore cafe before publishing");
  if (!hasValidCoords(cafe)) {
    throw new HttpError(
      400,
      "Cafe coordinates (lat/lng) are required",
      "COORDS_REQUIRED",
    );
  }
  await env.DB.prepare(
    "UPDATE cafes SET status = 'approved', updated_at = ? WHERE id = ?",
  )
    .bind(nowIso(), cafe.id)
    .run();
  return json({ ok: true });
}

// 버리기(제보)·내리기(공개 카페) 둘 다 여기. 사유는 제보자의 '내 제보'에 보인다.
export async function deleteCafe(req, env) {
  const body = await readJson(req);
  const cafe = await findCafe(env, body.id);
  const timestamp = nowIso();
  await env.DB.prepare(
    "UPDATE cafes SET deleted_at = ?, reject_reason = ?, updated_at = ? WHERE id = ?",
  )
    .bind(timestamp, cleanText(body.reason, 500), timestamp, cafe.id)
    .run();
  return json({ ok: true });
}

export async function restoreCafe(req, env) {
  const cafe = await findCafe(env, (await readJson(req)).id);
  await env.DB.prepare(
    "UPDATE cafes SET deleted_at = NULL, reject_reason = '', updated_at = ? WHERE id = ?",
  )
    .bind(nowIso(), cafe.id)
    .run();
  return json({ ok: true });
}

// 영구 삭제는 내린 카페만 — 공개 중인 카페를 한 번에 지우는 길을 두지 않는다.
export async function purgeCafe(req, env) {
  const cafe = await findCafe(env, (await readJson(req)).id);
  if (!cafe.deleted_at)
    throw new HttpError(400, "Take the cafe down before deleting");
  await env.DB.prepare("DELETE FROM cafes WHERE id = ?").bind(cafe.id).run();
  return json({ ok: true });
}

export async function setNotice(req, env) {
  await env.DB.prepare(
    "UPDATE settings SET value = ?, updated_at = ? WHERE key = 'notice'",
  )
    .bind(cleanText(await req.text(), 500), nowIso())
    .run();
  return json({ ok: true });
}

// 주소→좌표(Nominatim, 초당 1회 정책) — 어드민 좌표 채우기만 쓴다.
export async function geocode(req) {
  const q = cleanText(new URL(req.url).searchParams.get("q"), 80);
  if (q.length < 2) throw new HttpError(400, "Query too short");
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": "kohee-list/1.0 (koheelist@gmail.com)" } },
  );
  const [hit] = res.ok ? await res.json() : [];
  if (!hit) throw new HttpError(404, "Address not found");
  return json({
    ok: true,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name,
  });
}
