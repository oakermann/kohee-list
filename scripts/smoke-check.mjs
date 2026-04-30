import process from "node:process";

const PAGES_URL = process.env.PAGES_URL || "https://kohee.pages.dev";
const PAGES_ADMIN_URL =
  process.env.PAGES_ADMIN_URL || new URL("/admin.html", PAGES_URL).toString();
const WORKER_URL =
  process.env.WORKER_URL || "https://kohee-list.gabefinder.workers.dev";
const WORKER_HEALTH_URL =
  process.env.WORKER_HEALTH_URL || new URL("/health", WORKER_URL).toString();
const WORKER_HEALTH_DB_URL =
  process.env.WORKER_HEALTH_DB_URL ||
  new URL("/health/db", WORKER_URL).toString();
const WORKER_VERSION_URL =
  process.env.WORKER_VERSION_URL || new URL("/version", WORKER_URL).toString();
const WORKER_DATA_URL =
  process.env.WORKER_DATA_URL || new URL("/data", WORKER_URL).toString();

const PUBLIC_CAFE_KEYS = new Set([
  "id",
  "name",
  "address",
  "desc",
  "lat",
  "lng",
  "signature",
  "beanShop",
  "instagram",
  "category",
  "oakerman_pick",
  "manager_pick",
  "updated_at",
]);

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "approved_by",
  "created_by",
  "deleted_at",
  "deleted_by",
  "delete_reason",
  "hidden_by",
  "internalMemo",
  "rejected_by",
  "selectionReason",
  "sourceUrls",
  "submitter",
]);

function hasArg(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Usage: node scripts/smoke-check.mjs [--pages] [--worker]

Options:
  --pages   Check public and admin Pages URLs.
  --worker  Check Worker health, DB health, version, and public data URLs.
  --help    Show this help.

If no target is provided, both Pages and Worker checks are run.`);
}

async function retry(name, task, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.warn(
        `[smoke] ${name} failed (${attempt}/${attempts}): ${error.message}`,
      );
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }
  throw lastError;
}

async function checkPages() {
  await retry("Pages", async () => {
    const response = await fetch(PAGES_URL, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Pages returned HTTP ${response.status}`);
    }
    const body = await response.text();
    if (!body.includes("KOHEE")) {
      throw new Error("Pages HTML did not include KOHEE marker text");
    }
    console.log(`[smoke] Pages ok: ${PAGES_URL}`);
  });

  await retry("Pages admin", async () => {
    const response = await fetch(PAGES_ADMIN_URL, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Pages admin returned HTTP ${response.status}`);
    }
    const body = await response.text();
    if (!body.includes("admin.js")) {
      throw new Error("Pages admin HTML did not include admin script marker");
    }
    console.log(`[smoke] Pages admin ok: ${PAGES_ADMIN_URL}`);
  });
}

async function checkWorker() {
  await retry("Worker health", async () => {
    const response = await fetch(WORKER_HEALTH_URL, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Worker health returned HTTP ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    if (payload.ok !== true) {
      throw new Error("Worker health did not return ok=true");
    }
    console.log(`[smoke] Worker health ok: ${WORKER_HEALTH_URL}`);
  });

  await retry("Worker DB health", async () => {
    const response = await fetch(WORKER_HEALTH_DB_URL, { redirect: "follow" });
    const payload = await response.json().catch(() => ({}));
    const isOk = response.ok && payload.ok === true && payload.db === "ok";
    const isSafeUnavailable =
      response.status === 503 &&
      payload.ok === false &&
      payload.code === "DB_UNAVAILABLE";
    if (!isOk && !isSafeUnavailable) {
      throw new Error(
        `Worker DB health returned unsafe status ${response.status}`,
      );
    }
    console.log(`[smoke] Worker DB health safe: ${WORKER_HEALTH_DB_URL}`);
  });

  await retry("Worker version", async () => {
    const response = await fetch(WORKER_VERSION_URL, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Worker version returned HTTP ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    if (
      payload.ok !== true ||
      payload.service !== "kohee-list" ||
      typeof payload.version !== "string" ||
      typeof payload.deployCheck !== "string"
    ) {
      throw new Error("Worker version returned unsafe shape");
    }
    console.log(`[smoke] Worker version ok: ${WORKER_VERSION_URL}`);
  });

  await retry("Worker public data", async () => {
    const response = await fetch(WORKER_DATA_URL, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Worker data returned HTTP ${response.status}`);
    }
    const payload = await response.json().catch(() => null);
    if (!Array.isArray(payload)) {
      throw new Error("Worker data did not return a public cafe array");
    }
    const sample = payload[0];
    if (sample && typeof sample === "object") {
      for (const key of Object.keys(sample)) {
        if (FORBIDDEN_PUBLIC_KEYS.has(key) || !PUBLIC_CAFE_KEYS.has(key)) {
          throw new Error(`Worker data exposed non-public key: ${key}`);
        }
      }
    }
    console.log(`[smoke] Worker public data ok: ${WORKER_DATA_URL}`);
  });
}

if (hasArg("--help")) {
  printHelp();
  process.exit(0);
}

const shouldCheckPages = hasArg("--pages");
const shouldCheckWorker = hasArg("--worker");
const checkBoth = !shouldCheckPages && !shouldCheckWorker;

try {
  if (checkBoth || shouldCheckPages) await checkPages();
  if (checkBoth || shouldCheckWorker) await checkWorker();
  console.log("[smoke] checks passed");
} catch (error) {
  console.error(`[smoke] failed: ${error.message}`);
  process.exitCode = 1;
}
