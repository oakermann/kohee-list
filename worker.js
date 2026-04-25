import { corsPreflight, isCorsOriginAllowed, json } from "./server/shared.js";
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

      return json(
        { ok: false, error: "Not found", code: "NOT_FOUND" },
        404,
        req,
        env,
      );
    } catch (err) {
      return json(
        {
          ok: false,
          error: err.message || "Server error",
          code: "SERVER_ERROR",
        },
        500,
        req,
        env,
      );
    }
  },
};
