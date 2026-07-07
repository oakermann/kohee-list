import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

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
