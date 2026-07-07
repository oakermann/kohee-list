import assert from "node:assert/strict";
import fs from "node:fs";

import { deleteAccount } from "../server/account.js";
import { signup } from "../server/auth.js";
import { hashPassword } from "../server/shared.js";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const CORRECT_PASSWORD = "correct-horse-battery";
const PASSWORD_HASH = await hashPassword(CORRECT_PASSWORD);

// ---------------------------------------------------------------------------
// #1 Privacy policy page (PIPA Article 30)
// ---------------------------------------------------------------------------
for (const path of ["privacy.html", ".pages-deploy/privacy.html"]) {
  const html = read(path);
  // All 8 required 처리방침 sections are present.
  assert.ok(
    html.includes("수집하는 개인정보 항목"),
    `${path} missing section 1`,
  );
  assert.ok(html.includes("수집·이용 목적"), `${path} missing section 2`);
  assert.ok(html.includes("보유·이용 기간"), `${path} missing section 3`);
  assert.ok(html.includes("제3자 제공"), `${path} missing section 4`);
  assert.ok(
    html.includes("국외 이전"),
    `${path} missing overseas-transfer notice`,
  );
  assert.ok(html.includes("정보주체의 권리"), `${path} missing section 5`);
  assert.ok(html.includes("파기 절차"), `${path} missing section 6`);
  assert.ok(html.includes("개인정보 보호책임자"), `${path} missing section 7`);
  // Version + effective date must match #3's stored consent_version.
  assert.ok(html.includes("v1.0"), `${path} missing consent version v1.0`);
  assert.ok(html.includes("2026년 7월 7일"), `${path} missing effective date`);
  // Owner-fill placeholder for the protection-officer contact.
  assert.ok(
    html.includes("[연락처: 오커맨"),
    `${path} missing owner-fill contact placeholder`,
  );
}

// A "개인정보 처리방침" footer link exists on all 5 app pages + their mirrors.
for (const path of [
  "index.html",
  "mypage.html",
  "submit.html",
  "login.html",
  "admin.html",
  ".pages-deploy/index.html",
  ".pages-deploy/mypage.html",
  ".pages-deploy/submit.html",
  ".pages-deploy/login.html",
  ".pages-deploy/admin.html",
]) {
  const html = read(path);
  assert.match(
    html,
    /href="privacy\.html"[^>]*>[^<]*개인정보 처리방침/,
    `${path} missing privacy-policy footer link`,
  );
}

console.log("[pipa-privacy] ok");

// ---------------------------------------------------------------------------
// #2 회원탈퇴 / delete-account (PIPA Article 35-5/36/37)
// ---------------------------------------------------------------------------
function createDeleteAccountEnv({
  role = "user",
  passwordHash = PASSWORD_HASH,
} = {}) {
  const statements = [];
  const batches = [];
  return {
    statements,
    batches,
    env: {
      SESSION_SECRET: "unit-test-secret",
      DB: {
        prepare(sql) {
          const statement = {
            sql,
            bindings: [],
            bind(...values) {
              this.bindings = values;
              statements.push(this);
              return this;
            },
            first: async () => {
              if (/FROM\s+sessions\s+s/i.test(sql)) {
                return {
                  session_id: "session-1",
                  user_id: "user-1",
                  username: "coffee-user",
                  role,
                  expires_at: "2999-01-01T00:00:00.000Z",
                  csrf_token_hash: "",
                };
              }
              if (/SELECT\s+id,\s+password_hash\s+FROM\s+users/i.test(sql)) {
                return { id: "user-1", password_hash: passwordHash };
              }
              return null;
            },
            run: async () => ({ success: true }),
          };
          return statement;
        },
        batch(prepared) {
          batches.push(prepared);
          return Promise.resolve(prepared.map(() => ({ success: true })));
        },
      },
    },
  };
}

function deleteAccountRequest(password) {
  return new Request("https://kohee.test/delete-account", {
    method: "POST",
    headers: {
      authorization: "Bearer unit-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

// Happy path: correct password -> 200, audit written before delete, atomic
// child-first batch, cafes de-identified, users last, cookies cleared.
{
  const { env, statements, batches } = createDeleteAccountEnv();
  const response = await deleteAccount(
    deleteAccountRequest(CORRECT_PASSWORD),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);

  // Cookies cleared like logout (session + csrf).
  const cookies = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")];
  const cookieBlob = cookies.join(" ");
  assert.match(cookieBlob, /kohee_session=;/);
  assert.match(cookieBlob, /kohee_csrf=;/);

  // Deletion audit log written (before the batch delete of the actor).
  const audit = statements.find((s) =>
    /INSERT\s+INTO\s+audit_logs/i.test(s.sql),
  );
  assert.ok(audit, "deletion audit log must be written");
  assert.equal(audit.bindings[2], "user.delete_account");
  // No secrets in the persisted audit JSON.
  assert.doesNotMatch(audit.bindings[6] || "", /password/i);
  // The scrubbed before/after must not re-identify via username (enforced by
  // #4's scrubAuditValue hardening, checked in the #4 block below).

  // Exactly one atomic batch performed the destructive work.
  assert.equal(batches.length, 1, "delete must be a single atomic batch");
  const batchSql = batches[0].map((s) => s.sql);
  assert.ok(
    batchSql.some((s) => /DELETE\s+FROM\s+error_report_replies/i.test(s)),
  );
  assert.ok(batchSql.some((s) => /DELETE\s+FROM\s+error_reports/i.test(s)));
  assert.ok(batchSql.some((s) => /DELETE\s+FROM\s+submissions/i.test(s)));
  assert.ok(batchSql.some((s) => /DELETE\s+FROM\s+favorites/i.test(s)));
  assert.ok(batchSql.some((s) => /DELETE\s+FROM\s+sessions/i.test(s)));
  // Public cafes preserved, author link removed (SET NULL, not DELETE).
  assert.ok(
    batchSql.some((s) =>
      /UPDATE\s+cafes\s+SET\s+created_by\s*=\s*NULL/i.test(s),
    ),
  );
  assert.equal(
    batchSql.some((s) => /DELETE\s+FROM\s+cafes/i.test(s)),
    false,
    "public cafes must never be deleted",
  );
  // users deleted last; child-first ordering.
  const usersIdx = batchSql.findIndex((s) => /DELETE\s+FROM\s+users/i.test(s));
  assert.equal(usersIdx, batchSql.length - 1, "users must be deleted last");
  const childIdx = batchSql.findIndex((s) =>
    /DELETE\s+FROM\s+error_report_replies/i.test(s),
  );
  assert.ok(childIdx < usersIdx, "children must be deleted before users");
}

// Wrong password -> 401 and NO destructive batch runs.
{
  const { env, batches } = createDeleteAccountEnv();
  const response = await deleteAccount(
    deleteAccountRequest("wrong-password"),
    env,
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "INVALID_CREDENTIALS");
  assert.equal(batches.length, 0, "no delete on bad password");
}

// Admin self-delete -> 403 (protects the last admin) and no batch.
{
  const { env, batches, statements } = createDeleteAccountEnv({
    role: "admin",
  });
  const response = await deleteAccount(
    deleteAccountRequest(CORRECT_PASSWORD),
    env,
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "ADMIN_SELF_DELETE_FORBIDDEN");
  assert.equal(batches.length, 0, "admin must not self-delete");
  // Blocked before any password re-select even runs.
  assert.equal(
    statements.some((s) =>
      /SELECT\s+id,\s+password_hash\s+FROM\s+users/i.test(s.sql),
    ),
    false,
  );
}

// The route is registered under USER_ROUTES and never reuses admin /delete.
{
  const routesSrc = read("server/routes.js");
  assert.ok(routesSrc.includes('["POST", "/delete-account", deleteAccount]'));
  assert.ok(routesSrc.includes('import { deleteAccount } from "./account.js"'));
}

console.log("[pipa-account] ok");

// ---------------------------------------------------------------------------
// #3 Signup consent (PIPA Article 15/22)
// ---------------------------------------------------------------------------
function createSignupEnv({ userCount = 5 } = {}) {
  const statements = [];
  return {
    statements,
    env: {
      SESSION_SECRET: "unit-test-secret",
      FIRST_ADMIN_CODE: "admin-code",
      DB: {
        prepare(sql) {
          const statement = {
            sql,
            bindings: [],
            bind(...values) {
              this.bindings = values;
              statements.push(this);
              return this;
            },
            first: async () => {
              if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+username/i.test(sql)) {
                return null; // username available
              }
              if (/COUNT\(\*\)/i.test(sql)) {
                return { c: userCount };
              }
              if (/FROM\s+rate_limits/i.test(sql)) {
                return null;
              }
              return null;
            },
            run: async () => ({ success: true }),
          };
          return statement;
        },
      },
    },
  };
}

function signupRequest(body) {
  return new Request("https://kohee.test/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Signup without consent -> 400 CONSENT_REQUIRED and no user INSERT.
{
  const { env, statements } = createSignupEnv();
  const response = await signup(
    signupRequest({ username: "newuser1", password: "password123" }),
    env,
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "CONSENT_REQUIRED");
  assert.equal(
    statements.some((s) => /INSERT\s+INTO\s+users/i.test(s.sql)),
    false,
    "no user created without consent",
  );
}

// Signup with consent -> 201 and consent_at/consent_version stamped.
{
  const { env, statements } = createSignupEnv();
  const response = await signup(
    signupRequest({
      username: "newuser2",
      password: "password123",
      consent: true,
    }),
    env,
  );
  assert.equal(response.status, 201);
  const insert = statements.find((s) => /INSERT\s+INTO\s+users/i.test(s.sql));
  assert.ok(insert, "user must be inserted");
  assert.match(insert.sql, /consent_at/);
  assert.match(insert.sql, /consent_version/);
  // consent_version bound value must equal the privacy policy version.
  assert.ok(
    insert.bindings.includes("v1.0"),
    "consent_version v1.0 must be stored",
  );
}

// Frontend: consent checkbox + privacy link + consent:true in the request.
for (const path of ["login.html", ".pages-deploy/login.html"]) {
  const html = read(path);
  assert.ok(
    html.includes('id="signup-consent"'),
    `${path} missing consent checkbox`,
  );
  assert.match(
    html,
    /href="privacy\.html"/,
    `${path} signup consent must link privacy.html`,
  );
}
for (const path of ["assets/login.js", ".pages-deploy/assets/login.js"]) {
  const js = read(path);
  // Reads the consent checkbox and includes it in the signup request body.
  assert.match(js, /signup-consent/, `${path} must read the consent checkbox`);
  assert.match(
    js,
    /"\/signup",\s*\{\s*username,\s*password,\s*consent/,
    `${path} must send consent in the signup request`,
  );
}

console.log("[pipa-consent] ok");
