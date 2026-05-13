import assert from "node:assert/strict";
import fs from "node:fs";

import {
  formatProjectProfileReport,
  validateProjectProfile,
  validateProjectProfiles,
} from "./project-profile-validator.mjs";

const koheeProfile = JSON.parse(
  fs.readFileSync("docs/project-profiles/kohee-list.json", "utf8"),
);

const koheeResult = validateProjectProfile(
  koheeProfile,
  "docs/project-profiles/kohee-list.json",
);
assert.equal(koheeResult.ok, true);
assert.equal(koheeResult.decision, "READY");
assert.equal(koheeResult.reason, "PROJECT_PROFILE_READY");
assert.deepEqual(
  koheeResult.placeholders.map((placeholder) => placeholder.decision),
  ["HOLD_NOT_ROUTABLE", "HOLD_NOT_ROUTABLE", "HOLD_NOT_ROUTABLE"],
);

const allProfiles = validateProjectProfiles();
assert.equal(allProfiles.ok, true);
assert.equal(allProfiles.decision, "READY");
assert.equal(allProfiles.placeholders.length, 3);

const invalidProfile = structuredClone(koheeProfile);
delete invalidProfile.repository.full_name;
invalidProfile.routing.active_lane = "NOT_A_LANE";
const invalidResult = validateProjectProfile(invalidProfile);
assert.equal(invalidResult.ok, false);
assert.equal(invalidResult.decision, "FIX_REQUIRED");
assert.match(invalidResult.errors.join("\n"), /repository\.full_name/);
assert.match(invalidResult.errors.join("\n"), /unsupported routing\.active_lane/);

const badPlaceholder = structuredClone(koheeProfile);
badPlaceholder.placeholder_projects = [
  { project: "News app", status: "active" },
];
const badPlaceholderResult = validateProjectProfile(badPlaceholder);
assert.equal(badPlaceholderResult.ok, false);
assert.match(
  badPlaceholderResult.errors.join("\n"),
  /placeholder project must use status placeholder_only/,
);

const emptyReport = validateProjectProfiles([]);
assert.equal(emptyReport.ok, true);

const missingReport = validateProjectProfiles(["docs/project-profiles/missing.json"]);
assert.equal(missingReport.ok, false);
assert.equal(missingReport.decision, "FIX_REQUIRED");

const formatted = formatProjectProfileReport(allProfiles);
assert.match(formatted, /Project profile report/);
assert.match(formatted, /Decision: READY/);
assert.match(formatted, /KOHEE LIST/);
assert.match(formatted, /HOLD_NOT_ROUTABLE/);

console.log("[project-profile-validator] ok");
