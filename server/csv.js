// CSV 가져오기 = 새 카페를 후보로 넣는 것뿐이다. 기존 카페는 절대 덮어쓰지 않는다
// (옛 갱신 경로가 공개 카페를 후보로 내리고, CSV 에 없는 칸을 0·빈 값으로 덮었다).
import {
  HttpError,
  json,
  nowIso,
  requireAuth,
  requireRole,
  withGuard,
} from "./shared.js";
import { normalizeCafePayload } from "./cafes.js";
import { safeWriteAuditLog } from "./security.js";

const REQUIRED_HEADERS = ["name", "address", "desc"];
const IMPORTED_CAFE_STATUS = "candidate";

// RFC 4180: 따옴표 안의 쉼표·줄바꿈·"" 를 그대로 읽는다.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new HttpError(400, "Malformed CSV", "VALIDATION_ERROR");
  row.push(cell);
  rows.push(row);
  return rows.filter((cells) => cells.some((value) => value.trim()));
}

// 이름은 표기가 갈려 같은 곳을 놓친다 — 주소(공백 제거)로 비교한다.
export function addressKey(address) {
  return String(address || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function rowPayload(headers, cells) {
  const value = (name) => {
    const i = headers.indexOf(name);
    return i < 0 ? "" : String(cells[i] || "").trim();
  };
  const list = (name) =>
    value(name)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const payload = normalizeCafePayload({
    name: value("name"),
    address: value("address"),
    desc: value("desc"),
    lat: value("lat"),
    lng: value("lng"),
    signature: list("signature"),
    beanShop: value("beanShop"),
    instagram: value("instagram"),
    naver_url: value("naver_url"),
    category: list("category"),
    oakerman_pick: ["1", "true", "yes"].includes(
      value("oakerman_pick").toLowerCase(),
    ),
  });
  if (!payload.name || !payload.address || !payload.desc) {
    throw new HttpError(400, "name/address/desc required", "VALIDATION_ERROR");
  }
  return payload;
}

async function analyzeCsv(raw, env) {
  const [headerCells, ...body] = parseCsv(raw);
  const headers = (headerCells || []).map((name) => name.trim());
  const missing = REQUIRED_HEADERS.filter((name) => !headers.includes(name));
  if (missing.length) {
    throw new HttpError(
      400,
      `Missing required CSV headers: ${missing.join(", ")}`,
      "VALIDATION_ERROR",
    );
  }
  if (!body.length)
    throw new HttpError(400, "CSV is empty", "VALIDATION_ERROR");

  const existing = await env.DB.prepare(
    "SELECT name, address FROM cafes",
  ).all();
  const known = new Map(
    (existing.results || []).map((cafe) => [
      addressKey(cafe.address),
      cafe.name,
    ]),
  );
  const added = [];
  const skipped = [];
  const failedRows = [];
  body.forEach((cells, index) => {
    const row = index + 2;
    try {
      if (cells.length !== headers.length) {
        throw new HttpError(400, "CSV row field count does not match headers");
      }
      const payload = rowPayload(headers, cells);
      const key = addressKey(payload.address);
      if (known.has(key)) {
        skipped.push({ row, name: payload.name, existing: known.get(key) });
        return;
      }
      known.set(key, payload.name);
      added.push(payload);
    } catch (err) {
      // 행 검증 실패만 실패 행이다 — DB·코드 오류를 '잘못된 행' 으로 바꾸면 원인이 숨는다
      if (!(err instanceof HttpError)) throw err;
      failedRows.push({ row, error: err.message });
    }
  });
  return { total: body.length, added, skipped, failedRows };
}

function insertCafe(env, user, payload, timestamp) {
  return env.DB.prepare(
    `INSERT INTO cafes(
      id, name, address, desc, lat, lng, signature, beanShop, instagram, naver_url, category,
      oakerman_pick, status, created_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    payload.name,
    payload.address,
    payload.desc,
    payload.lat,
    payload.lng,
    payload.signature,
    payload.beanShop,
    payload.instagram,
    payload.naver_url,
    payload.category,
    payload.oakerman_pick,
    IMPORTED_CAFE_STATUS,
    user.user_id,
    timestamp,
  );
}

export async function importCsv(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["admin"]);

    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
    const { total, added, skipped, failedRows } = await analyzeCsv(
      await req.text(),
      env,
    );
    const result = {
      total,
      added: added.length,
      skipped,
      failed: failedRows.length,
      failedRows,
    };
    if (dryRun)
      return json({ ok: true, dryRun: true, ...result }, 200, req, env);
    if (failedRows.length) {
      throw new HttpError(400, "CSV validation failed", "VALIDATION_ERROR");
    }

    // 한 묶음(batch) = 전부 들어가거나 하나도 안 들어간다.
    const timestamp = nowIso();
    if (added.length) {
      await env.DB.batch(
        added.map((payload) => insertCafe(env, user, payload, timestamp)),
      );
    }
    await safeWriteAuditLog(env, {
      actorUserId: user.user_id,
      action: "csv.import",
      targetType: "cafes",
      after: {
        actor_role: user.role,
        total,
        added: added.length,
        skipped: skipped.length,
      },
    });
    return json({ ok: true, ...result }, 200, req, env);
  });
}
