#!/usr/bin/env node
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

for (const file of ["assets/index.js", "assets/mypage.js"]) {
  const content = read(file);
  if (!content) continue;
  if (
    /\b(status|candidate|hidden|rejected|deleted_at|deleted)\b/i.test(content)
  ) {
    warn(
      `${file} contains lifecycle/status terms; review public exposure paths manually`,
    );
  } else {
    ok(`${file} has no obvious lifecycle keyword leak markers`);
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

if (/status\s*=\s*'hidden'[\s\S]*hidden_at\s+IS\s+NOT\s+NULL/.test(cafes)) {
  ok("hold semantics (hidden + hidden_at) pattern detected");
} else {
  warn("hold semantics pattern not confidently detected in server/cafes.js");
}
if (/status\s*=\s*'hidden'[\s\S]*hidden_at\s+IS\s+NULL/.test(cafes)) {
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
  read("AGENTS.md") +
  read("docs/CODEX_WORKFLOW.md") +
  read(".github/pull_request_template.md") +
  read("package.json") +
  read("scripts/audit-kohee.mjs");
if (/\baaaa\b|\baaa\b/.test(refs)) warn("Possible aaa/aaaa reference found");
else ok("No obvious aaa/aaaa references detected");

if (errors.length || (strict && warnings.length)) {
  console.log(
    `\nResult: FAIL (errors=${errors.length}, warnings=${warnings.length}, strict=${strict})`,
  );
  process.exit(1);
}
console.log(`\nResult: PASS (warnings=${warnings.length}, strict=${strict})`);
