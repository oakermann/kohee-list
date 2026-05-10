import {
  isAllowedRepository,
  isSelfBotActor,
  verifyGithubSignature,
} from "./security.mjs";
import { decideWebhookAction } from "./policy.mjs";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function envFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim().toLowerCase() === "true";
}

function botLogins(env) {
  return String(env.KOHEE_BOT_LOGINS || "kohee-automation-bot[bot]")
    .split(",")
    .map((login) => login.trim())
    .filter(Boolean);
}

function actorLogin(payload) {
  return (
    payload?.sender?.login ||
    payload?.comment?.user?.login ||
    payload?.pull_request?.user?.login ||
    payload?.issue?.user?.login ||
    ""
  );
}

export async function handleWebhookRequest(request, env = {}) {
  const body = await request.text();
  const eventName = request.headers.get("x-github-event") || "";
  const deliveryId = request.headers.get("x-github-delivery") || "";
  const signature = request.headers.get("x-hub-signature-256") || "";

  if (!eventName) {
    return json({ ok: false, error: "Missing GitHub event header" }, 400);
  }
  if (!deliveryId) {
    return json({ ok: false, error: "Missing GitHub delivery header" }, 400);
  }

  const webhookSecret = env.GITHUB_WEBHOOK_SECRET || "";
  if (webhookSecret) {
    const verified = await verifyGithubSignature(body, signature, webhookSecret);
    if (!verified) {
      return json({ ok: false, error: "Invalid GitHub webhook signature" }, 401);
    }
  } else if (!envFlag(env.KOHEE_BOT_ALLOW_UNSIGNED_DRY_RUN, false)) {
    return json({ ok: false, error: "Webhook secret is required" }, 500);
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return json({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  if (!isAllowedRepository(payload, env.KOHEE_BOT_ALLOWED_REPOS || "")) {
    return json({ ok: false, error: "Repository is not allowed" }, 403);
  }

  const actor = actorLogin(payload);
  if (isSelfBotActor(actor, botLogins(env))) {
    return json({
      ok: true,
      dryRun: true,
      event: eventName,
      deliveryId,
      decision: "IGNORE_SELF_EVENT",
      reasons: [`ignored bot actor: ${actor}`],
      wouldDo: [],
    });
  }

  const decision = decideWebhookAction(eventName, payload);
  return json({
    ...decision,
    deliveryId,
    repository: payload?.repository?.full_name || null,
    botEnabled: envFlag(env.KOHEE_BOT_ENABLED, false),
    dryRun: true,
  });
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return json({
      ok: true,
      service: "kohee-github-app-worker",
      dryRun: true,
      botEnabled: envFlag(env.KOHEE_BOT_ENABLED, false),
    });
  }

  if (request.method === "POST" && url.pathname === "/github/webhook") {
    return handleWebhookRequest(request, env);
  }

  return json({ ok: false, error: "Not found" }, 404);
}

export default {
  fetch: handleRequest,
};
