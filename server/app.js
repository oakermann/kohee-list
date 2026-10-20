// API 입구 하나: Pages 함수(functions/api)가 요청을 그대로 넘긴다. 경로의 /api 는 떼고 찾는다.
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
