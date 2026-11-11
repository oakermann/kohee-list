// CSV import = only inserting new cafes as candidates. Existing cafes are never overwritten
// (the old update path demoted public cafes to candidates and overwrote columns missing from the CSV with 0/empty).
import { HttpError, json } from "./shared.js";
import { insertCafeStatement, normalizeCafe } from "./cafes.js";

const REQUIRED_HEADERS = ["name", "address", "desc"];

// RFC 4180: commas, newlines and "" inside quotes are read as is.
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

// Names are spelled differently and miss the same place — compare by address (spaces removed).
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
  return normalizeCafe({
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
      // Only row validation failures are failed rows — turning DB/code errors into 'bad rows' hides the cause
      if (!(err instanceof HttpError)) throw err;
      failedRows.push({ row, error: err.message });
    }
  });
  return { total: body.length, added, skipped, failedRows };
}

// Inserted rows are all candidates (insertCafeStatement default) — publishing is a separate admin step.
export async function importCsv(req, env) {
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
  if (dryRun) return json({ ok: true, dryRun: true, ...result });
  if (failedRows.length) throw new HttpError(400, "CSV validation failed");
  // One batch = all rows go in or none do.
  if (added.length) {
    await env.DB.batch(
      added.map((cafe) => insertCafeStatement(env, cafe).statement),
    );
  }
  return json({ ok: true, ...result });
}
