import assert from "node:assert/strict";

import {
  BUCKETS,
  classifyFile,
  classifyFiles,
  formatReport,
  normalizePath,
} from "./policy-risk-report.mjs";

function bucketFor(file) {
  return classifyFile(file).bucket;
}

assert.equal(normalizePath(".\\docs\\foo.md"), "docs/foo.md");
assert.equal(bucketFor("docs/foo.md"), "LOW candidate");
assert.equal(bucketFor("docs/queues/AUTOMATION_PLATFORM.md"), "LOW candidate");
assert.equal(bucketFor("migrations/0001.sql"), "HIGH/HOLD candidate");
assert.equal(bucketFor("schema/0001.sql"), "HIGH/HOLD candidate");
assert.equal(bucketFor("d1/0001.sql"), "HIGH/HOLD candidate");
assert.equal(bucketFor("schema.sql"), "HIGH/HOLD candidate");
assert.equal(bucketFor("server/auth.js"), "HIGH/HOLD candidate");
assert.equal(bucketFor("server/session.js"), "HIGH/HOLD candidate");
assert.equal(bucketFor("server/csv.js"), "HIGH/HOLD candidate");
assert.equal(bucketFor(".github/workflows/validate.yml"), "HIGH/HOLD candidate");
assert.equal(bucketFor("wrangler.toml"), "HIGH/HOLD candidate");
assert.equal(bucketFor("package.json"), "MEDIUM+ candidate");
assert.equal(bucketFor("package-lock.json"), "MEDIUM+ candidate");
assert.equal(bucketFor("assets/index.js"), "unmatched/unknown");

const report = classifyFiles([
  "docs/foo.md",
  "migrations/0001.sql",
  "package.json",
  "assets/index.js",
]);

assert.equal(report.overall, "HIGH/HOLD candidate");
assert.equal(report.reportOnly, true);
assert.deepEqual(
  BUCKETS.map((bucket) => report.buckets[bucket].length),
  [1, 1, 1, 1],
);

const formatted = formatReport(report);
for (const bucket of BUCKETS) {
  assert.ok(formatted.includes(`${bucket}:`));
}
assert.ok(formatted.includes("Blocking: no;"));
assert.equal(formatted.trim().startsWith("Policy risk report"), true);

console.log("[policy-risk-report] ok");
