// Public cafes, candidates and reports all live in one cafe table.
//   public = status 'approved' AND deleted_at IS NULL  (the only condition for showing on the site)
//   candidate = status 'candidate' — admin entries, CSV, user reports (with client_id)
//   removed = deleted_at set — discarded reports, unpublished cafes. Restoring returns the original status.
import {
  GEOCODE_QUERY_MAX,
  geocodeAddress,
  matchesDistrict,
} from "./geocode.js";
import {
  HttpError,
  addressKey,
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

const CATEGORIES = ["espresso", "drip", "decaf", "instagram", "dessert"];
// No login, so flooding is stopped by a site-wide daily cap — reports only show once the admin publishes them anyway.
export const SUBMIT_DAILY_CAP = 30;
// Every cafe is in South Korea. Outside this box = a typo or swapped/copied lat and lng (0 = no coordinates yet).
const KOREA_BOUNDS = { lat: [33, 39], lng: [124, 132] };
// One bulk publish is a reviewed handful of candidates, not the whole table.
const BULK_PUBLISH_MAX = 100;

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

function parseCategories(value) {
  const categories = parseJsonArray(value);
  if (categories.some((category) => !CATEGORIES.includes(category))) {
    throw new HttpError(400, "Invalid category value");
  }
  return categories;
}

// Cafes with coordinate 0 silently drop out of 'near me' — block it before publishing.
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

// The lat and lng ranges do not overlap, so this also refuses lat = lng (11/18: a cafe had both = 37.543).
export function outsideKorea({ lat, lng }) {
  for (const [key, value] of Object.entries({ lat, lng })) {
    const [min, max] = KOREA_BOUNDS[key];
    if (value !== 0 && (value < min || value > max)) {
      return `${key} ${value} is outside South Korea (${min} to ${max})`;
    }
  }
  return "";
}

function assertCoords(cafe) {
  if (!hasValidCoords(cafe)) {
    throw new HttpError(
      400,
      "Cafe coordinates (lat/lng) are required",
      "COORDS_REQUIRED",
    );
  }
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
  const outside = outsideKorea(cafe);
  if (outside) throw new HttpError(400, outside, "COORDS_OUT_OF_RANGE");
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

export async function findCafe(env, id) {
  const cafe = await env.DB.prepare("SELECT * FROM cafes WHERE id = ?")
    .bind(cleanText(id, 80))
    .first();
  if (!cafe) throw new HttpError(404, "Cafe not found");
  return cafe;
}

// ---- public ----

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

// Same address (spaces ignored) as a cafe that is public or waiting — the report adds nothing.
async function assertNewAddress(env, address) {
  const rows = await env.DB.prepare(
    "SELECT address FROM cafes WHERE deleted_at IS NULL",
  ).all();
  const key = addressKey(address);
  if (rows.results.some((row) => addressKey(row.address) === key)) {
    throw new HttpError(409, "이미 등록된 카페입니다", "DUPLICATE");
  }
}

// Coordinates for a report, only when the hit names the address's district. Nothing is published by this;
// the admin still checks and publishes. A failed lookup leaves the report as before (no coordinates).
async function coordsFromAddress(address, key) {
  if (!key) return {};
  let hit;
  try {
    hit = await geocodeAddress(address, key);
  } catch (error) {
    console.error("report geocode failed", error.message);
    return {};
  }
  if (!hit || !matchesDistrict(address, hit.label) || outsideKorea(hit)) {
    return {};
  }
  const memo = cleanText(`coords: kakao address, ${hit.label}`, 500);
  return { lat: hit.lat, lng: hit.lng, memo };
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
  await assertNewAddress(env, cafe.address);
  Object.assign(
    cafe,
    await coordsFromAddress(cafe.address, env.KAKAO_REST_KEY),
  );
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

// ---- admin ----

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
  if (existing.status === "approved") assertCoords(cafe);
  await env.DB.prepare(
    `UPDATE cafes SET ${CAFE_FIELDS.map((f) => `${f} = ?`).join(", ")}, updated_at = ?
     WHERE id = ?`,
  )
    .bind(...CAFE_FIELDS.map((f) => cafe[f]), nowIso(), existing.id)
    .run();
  return json({ ok: true });
}

// The one publish path — single and bulk publishing both go through here.
async function publishOne(env, id) {
  const cafe = await findCafe(env, id);
  if (cafe.deleted_at)
    throw new HttpError(400, "Restore cafe before publishing");
  assertCoords(cafe);
  await env.DB.prepare(
    "UPDATE cafes SET status = 'approved', updated_at = ? WHERE id = ?",
  )
    .bind(nowIso(), cafe.id)
    .run();
  return cafe;
}

export async function publishCafe(req, env) {
  await publishOne(env, (await readJson(req)).id);
  return json({ ok: true });
}

// Publish several in a row; each row reports its own result, one failure does not stop the rest.
export async function publishCafes(req, env) {
  const { ids } = await readJson(req);
  if (!Array.isArray(ids) || !ids.length || ids.length > BULK_PUBLISH_MAX) {
    throw new HttpError(400, `ids: 1 to ${BULK_PUBLISH_MAX} cafe ids`);
  }
  const results = [];
  for (const id of ids) {
    try {
      const cafe = await publishOne(env, id);
      results.push({ id: cafe.id, name: cafe.name, ok: true });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      results.push({
        id: cleanText(id, 80),
        ok: false,
        code: error.code,
        error: error.message,
      });
    }
  }
  return json({ ok: true, results });
}

// Both discarding (reports) and unpublishing (public cafes) happen here. The reason shows in the reporter's 'my reports'.
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

// Permanent deletion only for unpublished cafes — there is no path that deletes a public cafe in one step.
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

// Address → coordinates for the admin form; the admin checks the label (district, neighbourhood) by eye.
export async function geocode(req, env) {
  if (!env.KAKAO_REST_KEY) throw new HttpError(503, "Geocoding not configured");
  const q = cleanText(
    new URL(req.url).searchParams.get("q"),
    GEOCODE_QUERY_MAX,
  );
  if (q.length < 2) throw new HttpError(400, "Query too short");
  const hit = await geocodeAddress(q, env.KAKAO_REST_KEY);
  if (!hit) throw new HttpError(404, "Address not found");
  return json({ ok: true, ...hit });
}
