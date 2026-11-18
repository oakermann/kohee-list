// Daily admin watch on the owner's Mac (launchd com.oakermann.kohee-watch, 09:10). Never writes to the site or DB.
//   1. queues: new candidates, user reports and open error reports since the last run (read-only D1 SELECTs)
//   2. health: every public cafe's coordinate range; a rotating slice's address-vs-coordinates distance
// Push = Ohamma hub, same endpoint and payload as blueprint-check/watch.sh. Only new things are pushed, errors once.
//   node scripts/admin-watch.mjs [--dry-run]   (dry run prints the push and leaves state.json alone)
// Exit: 0 ok · 1 a check failed · 2 the push failed (state not saved, so it is retried next run).
// Privacy: user-typed text (report names, error report text, client_id) is never selected or pushed — counts only.
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { hasValidCoords, outsideKorea } from "../server/cafes.js";
import {
  geocodeAddress,
  matchesDistrict,
  searchQuery,
} from "../server/geocode.js";

const SITE = "https://kohee.pages.dev";
const ADMIN_URL = `${SITE}/admin`;
const HUB_NOTIFY = "http://127.0.0.1:4096/notify";
const REPO_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STATE_DIR = path.join(
  os.homedir(),
  "Library/Application Support/kohee-watch",
);
const STATE_FILE = path.join(STATE_DIR, "state.json");
const CACHE_FILE = path.join(STATE_DIR, "geocode-cache.json");
export const SWEEP_PER_RUN = 20; // 128 public cafes / 20 = every cafe within 7 daily runs
export const GEOCODE_GAP_MS = 1100; // Nominatim policy: at most 1 request/s
// Measured 11/18 on 109 district-matched hits of the 128 public cafes: median 0.07 km, p90 1.36, p95 2.72,
// largest unflagged 2.84, then a gap to 4.31. Nominatim puts a road address somewhere on the road: 1–3 km is noise.
export const FAR_KM = 3;
export const PUSH_NAMES_MAX = 5;
const HUB_TIMEOUT_MS = 5000;
const WRANGLER_TIMEOUT_MS = 60000;
const EARTH_RADIUS_KM = 6371;
const QUEUE_SQL = [
  "SELECT id, name FROM cafes WHERE status = 'candidate' AND deleted_at IS NULL AND client_id IS NULL",
  "SELECT id FROM cafes WHERE status = 'candidate' AND deleted_at IS NULL AND client_id IS NOT NULL",
  "SELECT id FROM error_reports WHERE status = 'open'",
].join("; ");
const QUEUES = ["candidates", "submissions", "errorReports"];

// ---- pure parts (scripts/test-admin-watch.mjs) ----

export function haversineKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// What is wrong with a public cafe's coordinates on their own, or "" when nothing.
export function rangeProblem(cafe) {
  if (outsideKorea(cafe)) {
    return cafe.lat === cafe.lng
      ? `위도=경도 ${Number(cafe.lat).toFixed(4)}`
      : `한국 밖 ${cafe.lat}, ${cafe.lng}`;
  }
  return hasValidCoords(cafe) ? "" : "좌표 없음";
}

// Stored coordinates far from where the address geocodes. A hit outside the address's district judges nothing.
export function distanceProblem(cafe, hit) {
  if (!hit || !matchesDistrict(cafe.address, hit.label)) return "";
  const km = haversineKm(cafe, hit);
  return km > FAR_KM ? `주소와 ${km.toFixed(1)}km` : "";
}

// The next `size` cafes in id order from `cursor`, wrapping; returns the slice and the next cursor.
export function rotate(cafes, cursor, size = SWEEP_PER_RUN) {
  const sorted = [...cafes].sort((a, b) => a.id.localeCompare(b.id));
  if (!sorted.length) return { slice: [], next: 0 };
  const start = cursor % sorted.length;
  const count = Math.min(size, sorted.length);
  const slice = Array.from(
    { length: count },
    (_, i) => sorted[(start + i) % sorted.length],
  );
  return { slice, next: (start + count) % sorted.length };
}

// Rows of each queue whose id was not there last run.
export function queueNews(seen, queues) {
  return Object.fromEntries(
    QUEUES.map((name) => {
      const old = new Set(seen[name] || []);
      return [name, queues[name].filter((row) => !old.has(row.id))];
    }),
  );
}

export function queueLines(news) {
  const { candidates, submissions, errorReports } = news;
  return [
    candidates.length &&
      `새 후보 ${candidates.length}: ${nameList(candidates.map((c) => c.name))}`,
    submissions.length && `새 제보 ${submissions.length} (내용은 어드민에서)`,
    errorReports.length && `새 오류 제보 ${errorReports.length}`,
  ].filter(Boolean);
}

export function nameList(names) {
  const shown = names.slice(0, PUSH_NAMES_MAX).join(", ");
  const rest = names.length - PUSH_NAMES_MAX;
  return rest > 0 ? `${shown} 외 ${rest}` : shown;
}

export function freshFindings(pushed, findings) {
  const old = new Set(pushed || []);
  return findings.filter((finding) => !old.has(finding.key));
}

// Pushed finding keys stay only while their cafe is still public (key = kind:id:lat,lng).
export function prunePushed(keys, cafes) {
  const ids = new Set(cafes.map((cafe) => cafe.id));
  return [...new Set(keys)].filter((key) => ids.has(key.split(":")[1]));
}

export function buildMessage(lines) {
  if (!lines.length) return null;
  return { title: "코히리스트", text: [...lines, ADMIN_URL].join("\n") };
}

// ---- input and output ----

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(file, value) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 1)}\n`);
}

async function readQueues() {
  const { stdout } = await promisify(execFile)(
    "npx",
    ["wrangler", "d1", "execute", "kohee-list", "--remote", "--json"].concat([
      "--command",
      QUEUE_SQL,
    ]),
    { cwd: REPO_DIR, timeout: WRANGLER_TIMEOUT_MS },
  );
  const results = JSON.parse(stdout).map((statement) => statement.results);
  return Object.fromEntries(QUEUES.map((name, i) => [name, results[i]]));
}

async function fetchPublicCafes() {
  const res = await fetch(`${SITE}/api/data`);
  if (!res.ok) throw new Error(`/api/data HTTP ${res.status}`);
  return res.json();
}

// Cached by search text (an address change = a new lookup). Errors are not cached, so they retry next time.
async function cachedGeocode(address, cache) {
  const key = searchQuery(address);
  if (key in cache) return cache[key].hit;
  await sleep(GEOCODE_GAP_MS);
  const hit = await geocodeAddress(address);
  cache[key] = { hit, at: new Date().toISOString() };
  return hit;
}

async function push(message) {
  // Same request as watch.sh's `curl -d "$body"` (form content type, JSON body).
  const res = await fetch(HUB_NOTIFY, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(HUB_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`hub HTTP ${res.status}`);
  return res.status;
}

// ---- the two checks ----

async function checkQueues(state, next, lines) {
  const queues = await readQueues();
  const counts = QUEUES.map((name) => queues[name].length);
  if (state.seen) lines.push(...queueLines(queueNews(state.seen, queues)));
  else
    lines.push(
      `기준선 — 대기 중 후보 ${counts[0]} · 제보 ${counts[1]} · 오류 제보 ${counts[2]}`,
    );
  next.seen = Object.fromEntries(
    QUEUES.map((name) => [name, queues[name].map((row) => row.id)]),
  );
  console.log(
    `queues: candidates ${counts[0]}, reports ${counts[1]}, open error reports ${counts[2]}`,
  );
}

async function sweepDistances(slice, cache) {
  const checked = [];
  const failed = [];
  for (const cafe of slice.filter((c) => !rangeProblem(c))) {
    try {
      const hit = await cachedGeocode(cafe.address, cache);
      const matched = hit && matchesDistrict(cafe.address, hit.label);
      checked.push({ cafe, hit, km: matched ? haversineKm(cafe, hit) : null });
    } catch (error) {
      failed.push(`${cafe.name}: ${error.message}`);
    }
  }
  if (failed.length && !checked.length) {
    throw new Error(`geocoder down (${failed[0]})`);
  }
  return { checked, failed };
}

function findingsOf(cafes, checked) {
  const findings = [];
  for (const cafe of cafes) {
    const problem = rangeProblem(cafe);
    if (problem)
      findings.push({
        key: `range:${cafe.id}:${cafe.lat},${cafe.lng}`,
        text: `${cafe.name} ${problem}`,
      });
  }
  for (const { cafe, hit } of checked) {
    const problem = distanceProblem(cafe, hit);
    if (problem)
      findings.push({
        key: `far:${cafe.id}:${cafe.lat},${cafe.lng}`,
        text: `${cafe.name} ${problem}`,
      });
  }
  return findings;
}

function logSweep(cafes, slice, { checked, failed }, findings) {
  const matched = checked.filter((c) => c.km !== null);
  console.log(
    `health: ${cafes.length} public cafes range-checked; distance slice ${slice.length}: matched ${matched.length}, no usable hit ${checked.length - matched.length}, failed ${failed.length}`,
  );
  for (const { cafe, km } of matched.sort((a, b) => b.km - a.km)) {
    console.log(`  ${km.toFixed(2)} km  ${cafe.name}`);
  }
  for (const line of failed) console.log(`  failed  ${line}`);
  for (const finding of findings) console.log(`  FLAG  ${finding.text}`);
}

async function checkHealth(state, next, lines) {
  const cafes = await fetchPublicCafes();
  const cache = await readJsonFile(CACHE_FILE, {});
  const { slice, next: cursor } = rotate(cafes, state.cursor || 0);
  const sweep = await sweepDistances(slice, cache);
  await writeJsonFile(CACHE_FILE, cache);
  const findings = findingsOf(cafes, sweep.checked);
  logSweep(cafes, slice, sweep, findings);
  const fresh = freshFindings(state.pushed, findings);
  if (fresh.length)
    lines.push(
      `좌표 확인 ${fresh.length}: ${nameList(fresh.map((f) => f.text))}`,
    );
  next.cursor = cursor;
  next.pushed = prunePushed(
    [...(state.pushed || []), ...fresh.map((f) => f.key)],
    cafes,
  );
}

// ---- run ----

async function main(argv) {
  const dryRun = argv.includes("--dry-run");
  console.log(
    `[${new Date().toISOString()}] kohee-watch${dryRun ? " (dry run)" : ""}`,
  );
  const state = await readJsonFile(STATE_FILE, {});
  const next = { ...state, errors: [] };
  const lines = [];
  for (const [name, check] of [
    ["queues", checkQueues],
    ["health", checkHealth],
  ]) {
    try {
      await check(state, next, lines);
    } catch (error) {
      next.errors.push(
        `${name}: ${String(error.message).split("\n")[0].slice(0, 200)}`,
      );
    }
  }
  const newErrors = next.errors.filter(
    (e) => !(state.errors || []).includes(e),
  );
  lines.push(...newErrors.map((e) => `확인 실패 — ${e}`));
  for (const error of next.errors) console.log(`error: ${error}`);
  const message = buildMessage(lines);
  console.log(message ? `push:\n${message.text}` : "push: nothing new");
  if (dryRun) return next.errors.length ? 1 : 0;
  if (message) {
    try {
      console.log(`hub: HTTP ${await push(message)}`);
    } catch (error) {
      console.log(`hub push failed: ${error.message} — state kept for a retry`);
      return 2;
    }
  }
  await writeJsonFile(STATE_FILE, { ...next, ranAt: new Date().toISOString() });
  return next.errors.length ? 1 : 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
