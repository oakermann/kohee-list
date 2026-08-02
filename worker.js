import {
  corsPreflight,
  isCorsOriginAllowed,
  json,
  safeServerErrorBody,
} from "./server/shared.js";
import { ROUTES } from "./server/routes.js";

export default {
  async fetch(req, env) {
    try {
      const url = new URL(req.url);
      if (req.method === "OPTIONS") return corsPreflight(req, env);

      if (!isCorsOriginAllowed(req, env)) {
        return json(
          { ok: false, error: "Forbidden origin", code: "FORBIDDEN_ORIGIN" },
          403,
          req,
          env,
        );
      }

      const route = ROUTES.find(
        ([method, pathname]) =>
          method === req.method && pathname === url.pathname,
      );
      if (route) return route[2](req, env);

      // No API route matched. A browser asking for a page gets the site; anything else
      // keeps the JSON 404 the API has always returned. The binding is absent in tests
      // and in any deploy without static assets, so this path is inert there.
      if (env.ASSETS && (req.method === "GET" || req.method === "HEAD")) {
        const asset = await env.ASSETS.fetch(req);
        if (asset.status !== 404) return asset;
      }

      return json(
        { ok: false, error: "Not found", code: "NOT_FOUND" },
        404,
        req,
        env,
      );
    } catch (err) {
      console.error("worker request failed", err);
      return json(safeServerErrorBody(), 500, req, env);
    }
  },
};
