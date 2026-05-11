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
  return String(env.KOHEE_BOT_LOGINS || "kohee-list-automation[bot]")
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

function emitDryRunLog(entry) {
  const log = {
    type: "kohee.github_app_worker.dry_run_decision",
    timestamp: new Date().toISOString(),
    ...entry,
  };
  console.log(JSON.stringify(log));
  return log;
}

function responseWithLog(body, log, status = 200) {
  return json({ ...body, dryRunLog: log }, status);
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

  const repository = payload?.repository?.full_name || null;
  if (!isAllowedRepository(payload, env.KOHEE_BOT_ALLOWED_REPOS || "")) {
    const log = emitDryRunLog({
      event: eventName,
      deliveryId,
      repository,
      action: payload?.action || null,
      actor: actorLogin(payload) || null,
      decision: "REJECT_REPOSITORY_NOT_ALLOWED",
      wouldDo: [],
      reasons: ["repository is not allowed"],
      botEnabled: envFlag(env.KOHEE_BOT_ENABLED, false),
      dryRun: true,
    });
    return responseWithLog({ ok: false, error: "Repository is not allowed" }, log, 403);
  }

  const actor = actorLogin(payload);
  if (isSelfBotActor(actor, botLogins(env))) {
    const body = {
      ok: true,
      dryRun: true,
      event: eventName,
      deliveryId,
      decision: "IGNORE_SELF_EVENT",
      reasons: [`ignored bot actor: ${actor}`],
      wouldDo: [],
    };
    const log = emitDryRunLog({
      event: eventName,
      deliveryId,
      repository,
      action: payload?.action || null,
      actor,
      decision: body.decision,
      wouldDo: body.wouldDo,
      reasons: body.reasons,
      botEnabled: envFlag(env.KOHEE_BOT_ENABLED, false),
      dryRun: true,
    });
    return responseWithLog(body, log);
  }

  const decision = decideWebhookAction(eventName, payload);
  const responseBody = {
    ...decision,
    deliveryId,
    repository,
    botEnabled: envFlag(env.KOHEE_BOT_ENABLED, false),
    dryRun: true,
  };
  const log = emitDryRunLog({
    event: eventName,
    deliveryId,
    repository,
    action: payload?.action || null,
    actor: actor || null,
    decision: decision.decision,
    wouldDo: decision.wouldDo || [],
    reasons: decision.reasons || [],
    highRiskFiles: decision.highRiskFiles || [],
    botEnabled: responseBody.botEnabled,
    dryRun: true,
  });
  return responseWithLog(responseBody, log);
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
