import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const routes = read("server/routes.js");
const auth = read("server/auth.js");
const common = read("site/assets/common.js");
const adminHtml = read("site/admin.html");

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
// 권한을 바꾸는 경로 자체가 없다 — 관리자는 첫 가입자 하나뿐이다.
assert.equal(routes.includes('"/set-role"'), false);

assert.equal(
  /\bmanager\s*:/.test(common),
  false,
  "common.js should not expose any legacy manager role key",
);
assert.ok(common.includes('admin: "관리자"'));
assert.ok(common.includes('|| "일반 유저"'));

assert.equal(
  adminHtml.includes('<option value="manager"'),
  false,
  "admin.html should not allow assigning manager from the role dropdown",
);

console.log("[policy-guards] ok");
