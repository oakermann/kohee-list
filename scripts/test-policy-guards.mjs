import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const routes = read("server/routes.js");
const auth = read("server/auth.js");
const users = read("server/users.js");
const common = read("assets/common.js");
const deployCommon = read(".pages-deploy/assets/common.js");
const adminHtml = read("admin.html");
const deployAdminHtml = read(".pages-deploy/admin.html");
const commandDispatch = read(".github/workflows/kohee-command-dispatch.yml");

assert.equal(routes.includes("MANAGER_ROUTES"), false);
assert.ok(routes.includes("ADMIN_OPERATION_ROUTES"));
assert.ok(routes.includes("adminOnly(getSubmissions)"));
assert.ok(routes.includes("adminOnly(getErrorReports)"));
assert.ok(routes.includes("adminOnly(listCafes)"));
assert.ok(routes.includes("redactUserFacingOperators(mySubmissions)"));
assert.ok(routes.includes("redactUserFacingOperators(myErrorReports)"));
assert.ok(routes.includes('const USER_FACING_OPERATOR_LABEL = "운영진"'));

assert.ok(auth.includes("role: clientRole(user.role)"));
assert.ok(auth.includes('return role === "admin" ? "admin" : "user"'));
assert.ok(users.includes("role: publicRole(row.role)"));
assert.ok(users.includes('return role === "admin" ? "admin" : "user"'));
assert.ok(users.includes('role !== "user"'));
assert.equal(users.includes('body.role !== "manager"'), false);

for (const [path, content] of [
  ["assets/common.js", common],
  [".pages-deploy/assets/common.js", deployCommon],
]) {
  assert.equal(
    /\bmanager\s*:/.test(content),
    false,
    `${path} should not expose any legacy manager role key`,
  );
  assert.ok(content.includes('admin: "관리자"'));
  assert.ok(content.includes('|| "일반 유저"'));
}

for (const [path, content] of [
  ["admin.html", adminHtml],
  [".pages-deploy/admin.html", deployAdminHtml],
]) {
  assert.equal(
    content.includes('<option value="manager"'),
    false,
    `${path} should not allow assigning manager from the role dropdown`,
  );
}

assert.ok(commandDispatch.includes("- name: Create KOHEE command issue"));
assert.ok(
  commandDispatch.includes(
    "This dispatch is create-only and will not overwrite",
  ),
);
assert.equal(
  commandDispatch.includes("github.rest.issues.update"),
  false,
  "KOHEE command dispatch must not overwrite existing command issues",
);
assert.ok(commandDispatch.includes("github.rest.issues.create"));
assert.ok(commandDispatch.includes("Manual Codex trigger required"));

await import("./test-task-packet.mjs");
await import("./test-issue-task-bridge.mjs");
await import("./test-local-codex-watcher-dry-run.mjs");
await import("./test-merge-readiness-dry-run.mjs");
await import("./test-project-profile-validator.mjs");

console.log("[policy-guards] ok");
