const SIGNATURE_PREFIX = "sha256=";

function bytesToHex(bytes) {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function textToBytes(value) {
  return new TextEncoder().encode(String(value ?? ""));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

export async function signGithubWebhookBody(body, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    textToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textToBytes(body));
  return `${SIGNATURE_PREFIX}${bytesToHex(new Uint8Array(signature))}`;
}

export async function verifyGithubSignature(body, signatureHeader, secret) {
  if (!secret || !signatureHeader?.startsWith(SIGNATURE_PREFIX)) return false;
  const expected = await signGithubWebhookBody(body, secret);
  return timingSafeEqual(expected, String(signatureHeader));
}

export function isAllowedRepository(payload, allowedRepos) {
  const allowed = String(allowedRepos || "")
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
  if (!allowed.length) return false;
  return allowed.includes(payload?.repository?.full_name || "");
}

export function isBotActor(login, botLogins = []) {
  const actor = String(login || "").toLowerCase();
  if (!actor) return false;
  if (actor.includes("[bot]")) return true;
  return botLogins.map((bot) => String(bot).toLowerCase()).includes(actor);
}
