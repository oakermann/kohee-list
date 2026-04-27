import process from "node:process";

const PAGES_URL = process.env.PAGES_URL || "https://kohee.pages.dev";
const WORKER_HEALTH_URL =
  process.env.WORKER_HEALTH_URL ||
  "https://kohee-list.gabefinder.workers.dev/health";

function hasArg(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Usage: node scripts/smoke-check.mjs [--pages] [--worker]

Options:
  --pages   Check the KOHEE Pages URL.
  --worker  Check the Worker /health URL.
  --help    Show this help.

If no target is provided, both Pages and Worker health are checked.`);
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
