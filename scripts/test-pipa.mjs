import assert from "node:assert/strict";
import fs from "node:fs";

import { deleteAccount } from "../server/account.js";
import { signup } from "../server/auth.js";
import { hashPassword } from "../server/shared.js";
import { writeAuditLog } from "../server/security.js";

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

// ---------------------------------------------------------------------------
// #4 Audit scrub hardening + third-party PII minimization (PIPA Article 21)
// ---------------------------------------------------------------------------
{
  const security = read("server/security.js");
  // The audit scrub blocklist must cover re-identifiable PII keys.
  for (const key of [
    "username",
    "content",
    "name",
    "address",
    "desc",
    "reason",
    "user_id",
  ]) {
    assert.ok(
      security.includes(`"${key}"`),
      `scrubAuditValue must block "${key}"`,
    );
  }
}

// End-to-end: with the hardened scrub, the delete-account audit JSON no longer
// carries the re-identifiable username in before/after.
{
  const { env, statements } = createDeleteAccountEnv();
  await deleteAccount(deleteAccountRequest(CORRECT_PASSWORD), env);
  const audit = statements.find((s) =>
    /INSERT\s+INTO\s+audit_logs/i.test(s.sql),
  );
  assert.ok(audit);
  assert.doesNotMatch(audit.bindings[5] || "", /coffee-user/);
  assert.doesNotMatch(audit.bindings[6] || "", /coffee-user/);
}

// Third-party PII minimization notices on free-text inputs.
for (const path of ["submit.html", ".pages-deploy/submit.html"]) {
  const html = read(path);
  assert.ok(
    html.includes("타인의 이름·연락처 등 개인정보는 입력하지 마세요"),
    `${path} missing PII-minimization notice`,
  );
}

console.log("[pipa-audit] ok");

// ---------------------------------------------------------------------------
// Review fixes (adversarial review of the PIPA diff)
// ---------------------------------------------------------------------------

// FIX 1 — historic PII backfill: the one-time migration nulls before/after
// snapshots so pre-scrub audit rows can no longer re-identify a deleted user.
// Model the migration as the transform it applies (drift-proof: null-all) and
// assert a seeded raw pre-scrub row keeps no PII.
{
  const migration = read("migrations/0008_scrub_audit_history.sql");
  // Drift-proof form: null both snapshot columns for ALL rows (no allowlist).
  assert.match(
    migration,
    /UPDATE\s+audit_logs\s+SET\s+before_json\s*=\s*NULL\s*,\s*after_json\s*=\s*NULL\s*;/i,
    "backfill migration must null all historic audit snapshots",
  );
  assert.doesNotMatch(
    migration,
    /WHERE/i,
    "backfill must not use an action allowlist (drifts)",
  );

  // A raw pre-scrub audit row with PII, run through the migration transform.
  const preScrubRow = {
    id: "audit-legacy-1",
    actor_user_id: "admin-1",
    action: "submission.approve",
    before_json: JSON.stringify({
      username: "coffee-user",
      name: "친구 이름",
      address: "서울시 어딘가 010-1234-5678",
      desc: "third party's phone leaked here",
    }),
    after_json: JSON.stringify({ status: "approved" }),
  };
  const applyBackfill = (row) => ({
    ...row,
    before_json: null,
    after_json: null,
  });
  const scrubbed = applyBackfill(preScrubRow);
  const blob = `${scrubbed.before_json ?? ""}${scrubbed.after_json ?? ""}`;
  assert.equal(scrubbed.before_json, null);
  assert.equal(scrubbed.after_json, null);
  assert.doesNotMatch(blob, /coffee-user|친구 이름|010-1234-5678|phone/);
  // No reader parses these columns, so NULL is safe (JSON.parse(null) never
  // runs on the audit path).
}

// FIX 2 — write-time scrub now drops error_reports free-text keys title/page.
// Runtime assertion via the real writeAuditLog scrub, not just source text.
{
  for (const key of ["title", "page"]) {
    assert.ok(
      read("server/security.js").includes(`"${key}"`),
      `scrubAuditValue must block "${key}"`,
    );
  }

  let insertedBefore = "";
  const env = {
    DB: {
      prepare() {
        return {
          bind(...values) {
            // audit_logs INSERT: before_json is bindings index 5.
            insertedBefore = values[5];
            return this;
          },
          run: async () => ({ success: true }),
        };
      },
    },
  };
  await writeAuditLog(env, {
    actorUserId: "admin-1",
    action: "error_report.reply",
    targetType: "error_report",
    targetId: "er-1",
    // Simulates the error_report.reply before:SELECT* snapshot.
    before: {
      id: "er-1",
      status: "open",
      title: "친구 김철수 010-9999-8888 신고",
      page: "카페 상세 010-0000-1111",
      content: "third party PII",
    },
    after: { status: "resolved" },
  });
  assert.doesNotMatch(
    insertedBefore,
    /친구 김철수|010-9999-8888|010-0000-1111/,
  );
  assert.doesNotMatch(insertedBefore, /"title"|"page"|"content"/);
  // Non-PII operational fields still retained.
  assert.match(insertedBefore, /"status":"open"/);
  assert.match(insertedBefore, /"id":"er-1"/);
}

// FIX 3 — the delete batch also purges the user's login rate-limit keys
// (which retain the plaintext lowercased username).
{
  const { env, batches } = createDeleteAccountEnv();
  await deleteAccount(deleteAccountRequest(CORRECT_PASSWORD), env);
  assert.equal(batches.length, 1);
  const rateLimitDelete = batches[0].find((s) =>
    /DELETE\s+FROM\s+rate_limits\s+WHERE\s+key\s+LIKE/i.test(s.sql),
  );
  assert.ok(rateLimitDelete, "delete batch must purge login rate-limit keys");
  assert.deepEqual(rateLimitDelete.bindings, ["login:%:coffee-user"]);
  // Purged before users are deleted (still inside the same atomic batch).
  const rlIdx = batches[0].indexOf(rateLimitDelete);
  const usersIdx = batches[0].findIndex((s) =>
    /DELETE\s+FROM\s+users/i.test(s.sql),
  );
  assert.ok(rlIdx < usersIdx, "rate_limits purge must precede user delete");
}

console.log("[pipa-review-fixes] ok");
