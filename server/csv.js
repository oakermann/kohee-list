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

export function parseCsvLine(line) {
  const out = [];
  let current = "";
  let quote = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (quote && line[i + 1] === "\"") {
        current += "\"";
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

  out.push(current);
  return out;
}

export async function importCsv(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    requireRole(user, ["manager", "admin"]);

    const raw = await req.text();
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new HttpError(400, "CSV is empty");

    const headers = parseCsvLine(lines[0]).map((v) => v.trim());
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

    let added = 0;
    let updated = 0;
    let duplicated = 0;
    let failed = 0;
    const duplicateRows = [];
    const failedRows = [];

    for (let i = 1; i < lines.length; i += 1) {
      try {
        const cols = parseCsvLine(lines[i]);
        const body = {
          id: cols[idx.id] || "",
          name: cols[idx.name] || "",
          address: cols[idx.address] || "",
          desc: cols[idx.desc] || "",
          lat: Number(cols[idx.lat] || 0),
          lng: Number(cols[idx.lng] || 0),
          signature: (cols[idx.signature] || "").split(",").map((v) => v.trim()).filter(Boolean),
          beanShop: cols[idx.beanShop] || "",
          instagram: cols[idx.instagram] || "",
          category: (cols[idx.category] || "").split(",").map((v) => v.trim()).filter(Boolean),
          oakerman_pick: cols[idx.oakerman_pick] === "1" || cols[idx.oakerman_pick] === "true",
          manager_pick: cols[idx.manager_pick] === "1" || cols[idx.manager_pick] === "true",
        };

        const payload = normalizeCafePayload(body, user.role);
        if (!payload.name || !payload.address || !payload.desc) throw new Error("name/address/desc required");

        const givenId = cleanText(body.id, 80);
        if (givenId) {
          const exists = await env.DB.prepare("SELECT id FROM cafes WHERE id = ?").bind(givenId).first();
          if (exists) {
            await env.DB.prepare(
              `UPDATE cafes SET
                name = ?, address = ?, desc = ?, lat = ?, lng = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
                oakerman_pick = ?, manager_pick = ?, updated_at = ?
               WHERE id = ?`,
            ).bind(
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
              nowIso(),
              givenId,
            ).run();
            updated += 1;
            continue;
          }
        }

        const duplicate = await env.DB.prepare(
          "SELECT id, name FROM cafes WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(address)) = lower(trim(?)) LIMIT 1",
        ).bind(body.name, body.address).first();
        if (duplicate) {
          await env.DB.prepare(
            `UPDATE cafes SET
              name = ?, address = ?, desc = ?, lat = ?, lng = ?, signature = ?, beanShop = ?, instagram = ?, category = ?,
              oakerman_pick = ?, manager_pick = ?, updated_at = ?
             WHERE id = ?`,
          ).bind(
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
            nowIso(),
            duplicate.id,
          ).run();
          updated += 1;
          duplicated += 1;
          duplicateRows.push({ row: i + 1, id: duplicate.id, name: duplicate.name || payload.name });
          continue;
        }

        await env.DB.prepare(
          `INSERT INTO cafes(
            id, name, address, desc, lat, lng, signature, beanShop, instagram, category,
            oakerman_pick, manager_pick, created_by, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          givenId || crypto.randomUUID(),
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
          nowIso(),
        ).run();
        added += 1;
      } catch (err) {
        failed += 1;
        failedRows.push({ row: i + 1, error: err.message || "invalid row" });
      }
    }

    return json(
      { ok: true, total: lines.length - 1, added, updated, duplicated, duplicateRows, failed, failedRows },
      200,
      req,
      env,
    );
  });
}
