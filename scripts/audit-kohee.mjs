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
if (/status\s*=\s*'approved'[\s\S]*deleted_at\s+IS\s+NULL/.test(cafes))
  ok("server/cafes.js public filtering appears safe");
else warn("server/cafes.js approved/deleted filter not confidently detected");

const fav = read("server/favorites.js");
if (/status\s*=\s*'approved'[\s\S]*deleted_at\s+IS\s+NULL/.test(fav))
  ok("server/favorites.js favorite filtering appears safe");
else
  warn(
    "server/favorites.js approved/deleted filter not detected (existing debt possible)",
  );

const csv = read("server/csv.js");
if (/DEFAULT_IMPORTED_CAFE_STATUS\s*=\s*"candidate"/.test(csv))
  ok("CSV approved stages as candidate appears enforced");
else warn("CSV candidate staging not confidently detected");
if (csv.includes("CSV reset failed"))
  ok("CSV reset safe error message present");
else fail("CSV reset safe error message missing");

const submissions = read("server/submissions.js");
if (/INSERT INTO cafes[\s\S]*"candidate"/.test(submissions))
  ok("approveSubmission appears to create candidate cafes");
else warn("approveSubmission candidate creation not confidently detected");

const workflows =
  read(".github/workflows/deploy.yml") +
  "\n" +
  read(".github/workflows/validate.yml") +
  "\n" +
  read(".github/workflows/pr-validate.yml");
if (
  /d1 migration/i.test(workflows) &&
  /wrangler d1 migrations apply/i.test(workflows)
)
  warn("Potential D1 auto-apply signal found in workflows");
else ok("No obvious D1 auto-apply command detected in workflows");

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

const mojibakeTargets = [
  "assets/index.js",
  "assets/mypage.js",
  "assets/admin.js",
];
for (const file of mojibakeTargets) {
  const content = read(file);
  for (const marker of ["?ㅼ", "?꾨", "?놁", "?ㅽ"]) {
    if (content.includes(marker))
      warn(`${file} contains mojibake marker ${marker}`);
  }
}

const touched =
  read("AGENTS.md") +
  read("docs/CODEX_WORKFLOW.md") +
  read(".github/pull_request_template.md");
if (/\baaaa\b|\baaa\b/.test(touched))
  warn("Possible aaa/aaaa reference introduced in edited files");

if (errors.length || (strict && warnings.length)) {
  console.log(
    `\nResult: FAIL (errors=${errors.length}, warnings=${warnings.length}, strict=${strict})`,
  );
  process.exit(1);
}
console.log(`\nResult: PASS (warnings=${warnings.length}, strict=${strict})`);
