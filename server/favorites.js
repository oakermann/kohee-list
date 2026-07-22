import {
  HttpError,
  cleanText,
  json,
  nowIso,
  readJson,
  requireAuth,
  withGuard,
} from "./shared.js";
import { toCafeResponse } from "./cafes.js";

export async function getFavorites(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    const rows = await env.DB.prepare(
      `SELECT f.id AS favorite_id, f.created_at,
              c.id, c.name, c.address, c.desc, c.lat, c.lng, c.signature, c.beanShop, c.instagram, c.category,
              c.oakerman_pick, c.updated_at
       FROM favorites f
       JOIN cafes c ON c.id = f.cafe_id
       WHERE f.user_id = ?
        AND c.status = 'approved'
        AND c.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
    )
      .bind(user.user_id)
      .all();

    const items = (rows.results || []).map((row) => ({
      favorite_id: row.favorite_id,
      created_at: row.created_at,
      cafe: toCafeResponse(row),
    }));

    return json({ ok: true, items }, 200, req, env);
  });
}

export async function toggleFavorite(req, env) {
  return withGuard(req, env, async () => {
    const user = await requireAuth(req, env);
    const body = await readJson(req);
    const cafeId = cleanText(body.cafe_id, 80);
    if (!cafeId) throw new HttpError(400, "cafe_id required");

    const action = cleanText(body.action, 20) || "toggle";
    if (action !== "toggle" && action !== "add" && action !== "remove") {
      throw new HttpError(400, "Invalid action", "VALIDATION_ERROR");
    }

    const cafe = await env.DB.prepare(
      `SELECT id
       FROM cafes
       WHERE id = ?
        AND status = 'approved'
        AND deleted_at IS NULL`,
    )
      .bind(cafeId)
      .first();

    const exists = await env.DB.prepare(
      "SELECT id FROM favorites WHERE user_id = ? AND cafe_id = ?",
    )
      .bind(user.user_id, cafeId)
      .first();

    if (!cafe && action !== "remove") {
      throw new HttpError(404, "Cafe not found");
    }

    if (action === "add" && exists) {
      return json({ ok: true, favored: true }, 200, req, env);
    }

    if (action === "remove" && !exists) {
      return json({ ok: true, favored: false }, 200, req, env);
    }

    if ((action === "toggle" && !exists) || action === "add") {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO favorites(id, user_id, cafe_id, created_at) VALUES (?, ?, ?, ?)",
      )
        .bind(crypto.randomUUID(), user.user_id, cafeId, nowIso())
        .run();
      return json({ ok: true, favored: true }, 200, req, env);
    }

    if ((action === "toggle" && exists) || action === "remove") {
      await env.DB.prepare(
        "DELETE FROM favorites WHERE user_id = ? AND cafe_id = ?",
      )
        .bind(user.user_id, cafeId)
        .run();
      return json({ ok: true, favored: false }, 200, req, env);
    }

    return json({ ok: true, favored: !!exists }, 200, req, env);
  });
}

export async function getGeocode(req, env) {
  return withGuard(req, env, async () => {
    const url = new URL(req.url);
    const q = cleanText(url.searchParams.get("q") || "", 100);

    if (!q || q.length < 2 || q.length > 80) {
      return json({ error: "Invalid query length", code: "VALIDATION_ERROR" }, 400, req, env);
    }

    try {
      const fetchUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(q)}`;
      const response = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "kohee-list/1.0"
        }
      });

      if (!response.ok) {
        return json({ error: "NOT_FOUND" }, 404, req, env);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const hit = data[0];
        return json(
          {
            lat: parseFloat(hit.lat),
            lng: parseFloat(hit.lon),
            label: hit.display_name
          },
          200,
          req,
          env
        );
      }
    } catch (err) {
      console.error("Geocode error", err);
    }

    return json({ error: "NOT_FOUND" }, 404, req, env);
  });
}
