#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const strict = process.argv.includes("--strict");
const warnings = [];
const errors = [];

const read = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
};

function ok(msg) {
  console.log(`OK: ${msg}`);
}
function warn(msg) {
  warnings.push(msg);
  console.log(`WARN: ${msg}`);
}
function fail(msg) {
  errors.push(msg);
  console.log(`FAIL: ${msg}`);
}

function mustMatch(content, regex, failMsg, okMsg) {
  if (regex.test(content)) ok(okMsg);
  else fail(failMsg);
}

function mustInclude(content, needle, failMsg, okMsg) {
  if (content.includes(needle)) ok(okMsg);
  else fail(failMsg);
}

function hasPublicLifecycleLeakMarker(file, content) {
  if (file === "assets/index.js") {
    const normalized = content
      .replaceAll("is-hidden", "")
      .replaceAll("document.hidden", "");
    return /\b(status|candidate|hidden|rejected|deleted_at|deleted)\b/i.test(
      normalized,
    );
  }

  if (file === "assets/mypage.js") {
    return /\b(deleted_at|hidden_at|hidden_by|candidate)\b/i.test(content);
  }

  return /\b(status|candidate|hidden|rejected|deleted_at|deleted)\b/i.test(
    content,
  );
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

function ensureRemoteRef(branch) {
  if (!branch) return "";
  const remoteRef = `origin/${branch}`;
  if (git(["rev-parse", "--verify", remoteRef])) return remoteRef;

  git([
    "fetch",
    "--no-tags",
    "--depth=1",
    "origin",
    `${branch}:refs/remotes/origin/${branch}`,
  ]);

  if (git(["rev-parse", "--verify", remoteRef])) return remoteRef;
  return "";
}

function gitFile(ref, path) {
  if (!ref) return "";
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch {
    return "";
  }
}

function firstUsableBaseRef() {
  const fetchedBaseRef = ensureRemoteRef(process.env.GITHUB_BASE_REF);
  const fetchedMainRef = fetchedBaseRef ? "" : ensureRemoteRef("main");
  const candidates = [
    fetchedBaseRef,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "",
    fetchedMainRef,
    "origin/main",
    "HEAD^1",
    "HEAD~1",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (git(["rev-parse", "--verify", candidate])) return candidate;
  }
  return "";
}

function changedFilesFromGit() {
  const files = new Set();
  const baseRef = firstUsableBaseRef();
  const diffRanges = [
    baseRef ? `${baseRef}...HEAD` : "",
    "HEAD",
    "--cached",
  ].filter(Boolean);

  for (const range of diffRanges) {
    const output =
      range === "--cached"
        ? git(["diff", "--name-only", "--cached"])
        : git(["diff", "--name-only", range]);
    for (const file of output.split(/\r?\n/).filter(Boolean)) files.add(file);
  }

  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  for (const file of untracked.split(/\r?\n/).filter(Boolean)) files.add(file);

  return { baseRef, files };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assetVersion(html, assetPath) {
  const escaped = escapeRegex(assetPath);
  const match = html.match(new RegExp(`${escaped}\\?v=([^"'>\\s]+)`));
  return match?.[1] || "";
}

function checkAdminAssetVersion(assetPath) {
  const rootHtml = read("admin.html");
  const deployHtml = read(".pages-deploy/admin.html");
  const rootVersion = assetVersion(rootHtml, assetPath);
  const deployVersion = assetVersion(deployHtml, assetPath);
  const label = assetPath.replace("./assets/", "");

  if (!rootVersion) {
    fail(`admin.html missing cache-busted ${assetPath}?v=... reference`);
    return;
  }
  if (!deployVersion) {
    fail(`.pages-deploy/admin.html missing cache-busted ${assetPath}?v=... reference`);
    return;
  }
  if (rootVersion !== deployVersion) {
    fail(
      `admin ${label} cache-bust mismatch: root=${rootVersion}, .pages-deploy=${deployVersion}`,
    );
  } else {
    ok(`admin ${label} cache-bust versions match (${rootVersion})`);
  }
}

function checkAdminAssetBump({ assetFile, assetPath, htmlFile, baseRef }) {
  if (!baseRef) {
    warn(
      `${assetFile} changed but no base ref was available to confirm ${htmlFile} version bump`,
    );
    return;
  }

  const currentVersion = assetVersion(read(htmlFile), assetPath);
  const previousVersion = assetVersion(gitFile(baseRef, htmlFile), assetPath);

  if (!currentVersion) {
    fail(`${htmlFile} missing cache-busted ${assetPath}?v=... reference`);
    return;
  }
  if (!previousVersion) {
    warn(
      `${assetFile} changed but ${htmlFile} had no comparable base ${assetPath}?v=... reference`,
    );
    return;
  }
  if (currentVersion === previousVersion) {
    fail(
      `${assetFile} changed but ${htmlFile} did not bump ${assetPath} version (${currentVersion})`,
    );
  } else {
    ok(
      `${assetFile} changed and ${htmlFile} bumped ${assetPath} version (${previousVersion} -> ${currentVersion})`,
    );
  }
}

const contractRaw = read("kohee.contract.json");
if (!contractRaw) fail("kohee.contract.json missing");
let contract = null;
try {
  contract = JSON.parse(contractRaw);
  ok("kohee.contract.json parses");
} catch {
  fail("kohee.contract.json invalid JSON");
}

if (contract) {
  const keys = [
    "project",
    "authModelTarget",
    "legacyRoles",
    "invariants",
    "lanes",
    "verify",
    "reportFormat",
    "forbidden",
  ];
  for (const key of keys) {
    if (Object.hasOwn(contract, key)) ok(`contract key present: ${key}`);
    else fail(`contract key missing: ${key}`);
  }

  const deployLane = contract?.lanes?.DEPLOY_SAFETY;
  if (deployLane?.files?.includes("scripts"))
    ok("DEPLOY_SAFETY lane includes scripts");
  else fail("DEPLOY_SAFETY lane file allowlist missing scripts");

  const governanceLane = contract?.lanes?.GOVERNANCE;
  if (governanceLane?.files?.includes("AGENTS.md"))
    ok("GOVERNANCE lane includes AGENTS.md");
  else fail("GOVERNANCE lane file allowlist missing AGENTS.md");
  if (governanceLane?.files?.includes("docs/CODEX_WORKFLOW.md"))
    ok("GOVERNANCE lane includes docs/CODEX_WORKFLOW.md");
  else fail("GOVERNANCE lane file allowlist missing docs/CODEX_WORKFLOW.md");

  const inv = contract.invariants || {};
  const requiredInv = {
    publicCafeWhere: "status = 'approved' AND deleted_at IS NULL",
    newCafeDefaultStatus: "candidate",
    publicApprovalGate: "approveCafe",
    holdDefinition: "status = 'hidden' AND hidden_at IS NOT NULL",
    legacyHiddenDefinition: "status = 'hidden' AND hidden_at IS NULL",
    csvApprovedStagesAs: "candidate",
    csvHiddenStagesAs: "hidden_with_hidden_at",
    resetCsvSafeError: "CSV reset failed",
  };
  for (const [k, v] of Object.entries(requiredInv)) {
    if (inv[k] === v) ok(`invariant matched: ${k}`);
    else fail(`invariant mismatch: ${k}`);
  }
}

const cafes = read("server/cafes.js");
mustMatch(
  cafes,
  /status\s*=\s*'approved'[\s\S]*deleted_at\s+IS\s+NULL/,
  "server/cafes.js public approved+non-deleted invariant missing",
  "server/cafes.js public filtering appears safe",
);

const fav = read("server/favorites.js");
if (/status\s*=\s*'approved'[\s\S]*deleted_at\s+IS\s+NULL/.test(fav)) {
  ok("server/favorites.js favorite filtering appears safe");
} else {
  warn(
    "server/favorites.js approved/deleted filter not detected (possible pre-existing debt)",
  );
}

const smokeCheck = read("scripts/smoke-check.mjs");
const publicCafeKeysBlock =
  smokeCheck.match(
    /const PUBLIC_CAFE_KEYS = new Set\(\[([\s\S]*?)\]\);/,
  )?.[1] || "";
const forbiddenPublicKeysBlock =
  smokeCheck.match(
    /const FORBIDDEN_PUBLIC_KEYS = new Set\(\[([\s\S]*?)\]\);/,
  )?.[1] || "";
if (/"manager_pick"/.test(publicCafeKeysBlock)) {
  fail("scripts/smoke-check.mjs still allows retired public key manager_pick");
} else {
  ok("retired manager_pick is not allowed in public smoke data shape");
}
if (/"manager_pick"/.test(forbiddenPublicKeysBlock)) {
  ok("retired manager_pick is explicitly forbidden in public smoke data shape");
} else {
  fail("scripts/smoke-check.mjs does not explicitly forbid manager_pick");
}

for (const file of ["assets/index.js", "assets/mypage.js"]) {
  const content = read(file);
  if (!content) continue;
  if (hasPublicLifecycleLeakMarker(file, content)) {
    warn(
      `${file} contains lifecycle/status terms; review public exposure paths manually`,
    );
  } else {
    ok(`${file} has no obvious public lifecycle leak markers`);
  }
}

const csv = read("server/csv.js");
if (/DEFAULT_IMPORTED_CAFE_STATUS\s*=\s*"candidate"/.test(csv)) {
  ok("CSV approved stages as candidate appears enforced");
} else {
  fail(
    "CSV approved publishing risk: DEFAULT_IMPORTED_CAFE_STATUS is not candidate",
  );
}
mustInclude(
  csv,
  "CSV reset failed",
  "CSV reset safe error message missing",
  "CSV reset safe error message present",
);

const submissions = read("server/submissions.js");
if (/INSERT INTO cafes[\s\S]*"candidate"/.test(submissions)) {
  ok("approveSubmission appears to create candidate cafes");
} else {
  fail("submission approval may create non-candidate cafes");
}

if (
  /status\s*=\s*'hidden'[\s\S]*hidden_at\s+IS\s+NOT\s+NULL/.test(cafes) ||
  /SET\s+status\s*=\s*'hidden'\s*,\s*hidden_at\s*=\s*\?/.test(cafes)
) {
  ok("hold semantics (hidden + hidden_at) pattern detected");
} else {
  warn("hold semantics pattern not confidently detected in server/cafes.js");
}
const tests = read("scripts/test-unit.mjs");
if (
  /status\s*=\s*'hidden'[\s\S]*hidden_at\s+IS\s+NULL/.test(cafes) ||
  (/status:\s*"hidden"[\s\S]*hidden_at:\s*null/.test(tests) &&
    /doesNotMatch\(holdListText,\s*\/Imported Hidden\//.test(tests))
) {
  ok("legacy hidden semantics (hidden + hidden_at NULL) pattern detected");
} else {
  warn(
    "legacy hidden semantics pattern not confidently detected in server/cafes.js",
  );
}

const workflows =
  read(".github/workflows/deploy.yml") +
  "\n" +
  read(".github/workflows/validate.yml") +
  "\n" +
  read(".github/workflows/pr-validate.yml");
const routes = read("server/routes.js");
const scriptSources = [
  "scripts/verify-release.ps1",
  "scripts/check-repo-safety.mjs",
  "scripts/check-syntax.ps1",
  "scripts/check-deploy-sync.mjs",
]
  .map((p) => read(p))
  .join("\n");
const d1Sources = `${workflows}\n${routes}\n${scriptSources}`;
if (/wrangler\s+d1\s+migrations\s+apply/i.test(d1Sources)) {
  fail("Potential D1 migration auto-apply command detected");
} else {
  ok("No obvious D1 auto-apply command detected in workflows/routes/scripts");
}

const changed = changedFilesFromGit();
checkAdminAssetVersion("./assets/admin.js");
checkAdminAssetVersion("./assets/admin.css");

const adminAssetChecks = [
  { assetFile: "assets/admin.js", assetPath: "./assets/admin.js" },
  {
    assetFile: ".pages-deploy/assets/admin.js",
    assetPath: "./assets/admin.js",
  },
  { assetFile: "assets/admin.css", assetPath: "./assets/admin.css" },
  {
    assetFile: ".pages-deploy/assets/admin.css",
    assetPath: "./assets/admin.css",
  },
];

for (const check of adminAssetChecks) {
  if (!changed.files.has(check.assetFile)) continue;
  checkAdminAssetBump({
    ...check,
    htmlFile: "admin.html",
    baseRef: changed.baseRef,
  });
  checkAdminAssetBump({
    ...check,
    htmlFile: ".pages-deploy/admin.html",
    baseRef: changed.baseRef,
  });
}

for (const file of ["assets/index.js", "assets/mypage.js", "assets/admin.js"]) {
  const content = read(file);
  if (!content) continue;
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (
      line.includes("innerHTML") &&
      !line.match(/innerHTML\s*=\s*["'`]\s*["'`]/)
    ) {
      warn(`${file}:${idx + 1} innerHTML usage requires manual review`);
    }
  });
}

for (const file of ["assets/index.js", "assets/mypage.js", "assets/admin.js"]) {
  const content = read(file);
  for (const marker of ["?ㅼ", "?꾨", "?놁", "?ㅽ"]) {
    if (content.includes(marker))
      warn(`${file} contains mojibake marker ${marker}`);
  }
}

const refs =
  read("README.md") +
  read(".prettierignore") +
  read("package.json") +
  read("sync-pages.ps1");
if (/\baaaa\b|\baaa\b/.test(refs)) warn("Possible aaa/aaaa reference found");
else ok("No obvious aaa/aaaa references detected");

if (errors.length || (strict && warnings.length)) {
  console.log(
    `\nResult: FAIL (errors=${errors.length}, warnings=${warnings.length}, strict=${strict})`,
  );
  process.exit(1);
}
console.log(`\nResult: PASS (warnings=${warnings.length}, strict=${strict})`);
