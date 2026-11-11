// Single API entry: the Pages function (functions/api) passes requests as is. The /api prefix is stripped for lookup.
import { HttpError, json } from "./shared.js";
import { ROUTES } from "./routes.js";

export async function handle(req, env) {
  const path = new URL(req.url).pathname.replace(/^\/api(?=\/)/, "");
  const route = ROUTES.find(
    ([method, p]) => method === req.method && p === path,
  );
  try {
    if (!route) throw new HttpError(404, "Not found");
    return await route[2](req, env);
  } catch (error) {
    if (error instanceof HttpError && error.status < 500) {
      return json(
        { ok: false, error: error.message, code: error.code },
        error.status,
      );
    }
    console.error("request failed", error);
    return json(
      { ok: false, error: "Server error", code: "SERVER_ERROR" },
      500,
    );
  }
}
