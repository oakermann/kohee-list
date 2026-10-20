#!/usr/bin/env node
import fs from "node:fs";
import { checkAssetCacheBusting } from "./check-asset-cache-busting.mjs";

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
  if (file === "site/assets/index.js") {
    const normalized = content
      .replaceAll("is-hidden", "")
      .replaceAll("document.hidden", "");
    return /\b(status|candidate|hidden|rejected|deleted_at|deleted)\b/i.test(
      normalized,
    );
  }

  if (file === "site/assets/mypage.js") {
    return /\b(deleted_at|hidden_at|hidden_by|candidate)\b/i.test(content);
  }

  return /\b(status|candidate|hidden|rejected|deleted_at|deleted)\b/i.test(
    content,
  );
}

function filesInDirectory(directory, predicate) {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && predicate(entry.name))
      .map((entry) => `${directory}/${entry.name}`);
  } catch {
    return [];
  }
}

function automationGuardRead(file) {
  let content = read(file);
  if (file !== "scripts/audit-kohee.mjs") return content;

  const patternName = "prohibitedAutomation";
  const patternStart = content.indexOf(`const ${patternName}Patterns = [`);
  const patternEnd = content.indexOf(`const ${patternName} =`, patternStart);
  if (patternStart !== -1 && patternEnd !== -1) {
    content = `${content.slice(0, patternStart)}${content.slice(patternEnd)}`;
  }

  const okPrefix = `  ok("No ${"prohibited"} `;
  const okStart = content.indexOf(okPrefix);
  if (okStart !== -1) {
    const okEnd = content.indexOf("\n", okStart);
    content = `${content.slice(0, okStart)}  ok("repository automation guard passed");${content.slice(okEnd)}`;
  }

  return content;
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
  if (governanceLane?.files?.includes("docs/KOHEE_MASTER_CONTEXT.md"))
    ok("GOVERNANCE lane includes docs/KOHEE_MASTER_CONTEXT.md");
  else fail("GOVERNANCE lane file allowlist missing docs/KOHEE_MASTER_CONTEXT.md");

  const inv = contract.invariants || {};
  const requiredInv = {
    publicCafeWhere: "status = 'approved' AND deleted_at IS NULL",
    newCafeDefaultStatus: "candidate",
    publicApprovalGate: "approveCafe",
    holdDefinition: "status = 'hidden' AND hidden_at IS NOT NULL",
    legacyHiddenDefinition: "status = 'hidden' AND hidden_at IS NULL",
    csvApprovedStagesAs: "candidate",
    csvHiddenStagesAs: "hidden_with_hidden_at",
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

for (const file of ["site/assets/index.js", "site/assets/mypage.js"]) {
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
]
  .map((p) => read(p))
  .join("\n");
const d1Sources = `${workflows}\n${routes}\n${scriptSources}`;
if (/wrangler\s+d1\s+migrations\s+apply/i.test(d1Sources)) {
  fail("Potential D1 migration auto-apply command detected");
} else {
  ok("No obvious D1 auto-apply command detected in workflows/routes/scripts");
}

const automationGuardSources = [
  ...filesInDirectory(".github/workflows", (name) => /\.ya?ml$/i.test(name)),
  ...filesInDirectory("scripts", (name) =>
    /\.(mjs|js|cjs|ps1|sh|cmd|bat)$/i.test(name),
  ),
  "package.json",
];
const automationGuardContent = automationGuardSources
  .map((file) => `${file}\n${automationGuardRead(file)}`)
  .join("\n");
const prohibitedAutomationPatterns = [
  {
    label: "unattended worker",
    regex: /\bunattended[-_\s]?worker\b/i,
  },
  {
    label: "auto-merge",
    regex:
      /\b(auto[-_\s]?merge|enablePullRequestAutoMerge|enable_auto_merge|gh\s+pr\s+merge[^\n\r]*--auto)\b/i,
  },
  {
    label: "branch deletion",
    regex:
      /\b(branch[-_\s]?deletion|delete[-_\s]?branch|deleteBranchOnMerge|gh\s+pr\s+merge[^\n\r]*--delete-branch|git\s+branch\s+-D|git\s+push[^\n\r]*--delete)\b/i,
  },
  {
    label: "issue close automation",
    regex: /\b(issue[-_\s]?close|close[-_\s]?issue|gh\s+issue\s+close)\b/i,
  },
  {
    label: "review/check gate bypass",
    regex:
      /\b(bypass[-_\s]?(review|check|gate)|override[-_\s]?(review|check|gate)|skip[-_\s]?required[-_\s]?(review|check|status))\b/i,
  },
];
const prohibitedAutomation = prohibitedAutomationPatterns
  .filter(({ regex }) => regex.test(automationGuardContent))
  .map(({ label }) => label);

if (prohibitedAutomation.length > 0) {
  fail(
    `Prohibited repository automation detected: ${prohibitedAutomation.join(", ")}`,
  );
} else {
  ok("No prohibited unattended worker/auto-merge/branch-delete/issue-close/gate-bypass automation detected");
}

const cacheBust = checkAssetCacheBusting();
if (cacheBust.skipped) warn(`asset cache-bust check skipped: ${cacheBust.reason}`);
else if (cacheBust.ok) ok("changed assets have bumped ?v= references");
else cacheBust.failures.forEach(fail);

for (const file of ["site/assets/index.js", "site/assets/mypage.js", "site/assets/admin.js"]) {
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

for (const file of ["site/assets/index.js", "site/assets/mypage.js", "site/assets/admin.js"]) {
  const content = read(file);
  for (const marker of ["?ㅼ", "?꾨", "?놁", "?ㅽ"]) {
    if (content.includes(marker))
      warn(`${file} contains mojibake marker ${marker}`);
  }
}

const refs =
  read("README.md") +
  read(".prettierignore") +
  read("package.json");
if (/\baaaa\b|\baaa\b/.test(refs)) warn("Possible aaa/aaaa reference found");
else ok("No obvious aaa/aaaa references detected");

if (errors.length || (strict && warnings.length)) {
  console.log(
    `\nResult: FAIL (errors=${errors.length}, warnings=${warnings.length}, strict=${strict})`,
  );
  process.exit(1);
}
console.log(`\nResult: PASS (warnings=${warnings.length}, strict=${strict})`);
