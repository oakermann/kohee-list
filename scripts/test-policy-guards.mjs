import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const routes = read("server/routes.js");
const cafes = read("server/cafes.js");
const submissions = read("server/submissions.js");
const errorReports = read("server/errorReports.js");
const auth = read("server/auth.js");
const users = read("server/users.js");
const common = read("assets/common.js");
const deployCommon = read(".pages-deploy/assets/common.js");

assert.equal(routes.includes("MANAGER_ROUTES"), false);
assert.ok(routes.includes("ADMIN_OPERATION_ROUTES"));
assert.ok(routes.includes("redactUserFacingOperators(mySubmissions)"));
assert.ok(routes.includes("redactUserFacingOperators(myErrorReports)"));
assert.ok(routes.includes('const USER_FACING_OPERATOR_LABEL = "운영진"'));

for (const [path, content] of [
  ["server/cafes.js", cafes],
  ["server/submissions.js", submissions],
  ["server/errorReports.js", errorReports],
]) {
  assert.equal(
    content.includes('requireRole(user, ["manager", "admin"])'),
    false,
    `${path} must not allow manager role through user guard`,
  );
  assert.equal(
    content.includes('requireRole(reviewer, ["manager", "admin"])'),
    false,
    `${path} must not allow manager role through reviewer guard`,
  );
}

assert.ok(auth.includes('role: clientRole(user.role)'));
assert.ok(users.includes('role: publicRole(row.role)'));
assert.equal(users.includes('role !== "manager"'), false);
assert.equal(users.includes('<option value="manager"'), false);

for (const [path, content] of [
  ["assets/common.js", common],
  [".pages-deploy/assets/common.js", deployCommon],
]) {
  assert.equal(
    /manager\s*:\s*["'`]매니저["'`]/.test(content),
    false,
    `${path} should not expose a manager role label`,
  );
  assert.ok(content.includes('admin: "관리자"'));
  assert.ok(content.includes('|| "일반 유저"'));
}

console.log("[policy-guards] ok");
