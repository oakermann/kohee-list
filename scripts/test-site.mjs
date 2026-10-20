// 화면 정적 검사: 페이지 JS 가 찾는 id 가 그 HTML 에 있는가, 처리방침 링크, 헤더 약속.
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const PAGES = ["index", "mypage", "submit", "admin"];

for (const page of PAGES) {
  const html = read(`site/${page}.html`);
  const js = read(`site/assets/${page}.js`);
  const ids = new Set([...html.matchAll(/\sid="([\w-]+)"/g)].map((m) => m[1]));
  // 지운 id 를 JS 가 찾으면 화면이 null 에서 멈춘다(10/20 csv-reset 사고).
  for (const [, id] of js.matchAll(/\$\("([\w-]+)"\)/g)) {
    assert.ok(
      ids.has(id),
      `site/assets/${page}.js looks up #${id}, missing in ${page}.html`,
    );
  }
  assert.match(
    html,
    /<script type="module" src="\.\/assets\/[\w]+\.js"><\/script>/,
  );
}

for (const page of [...PAGES, "privacy"]) {
  const html = read(`site/${page}.html`);
  assert.match(
    html,
    /href="privacy\.html"[^>]*>[^<]*개인정보 처리방침/,
    `${page}.html privacy link`,
  );
  assert.doesNotMatch(html, /login\.html|\?v=/, `${page}.html stale reference`);
}

const headers = read("site/_headers");
// 위치를 막으면 크롬·엣지(컴퓨터)에서 '내 주변'이 통째로 죽는다(10/21).
assert.match(headers, /geolocation=\(self\)/);
assert.match(headers, /\/assets\/\*\n {2}Cache-Control: no-cache/);
assert.match(read("site/privacy.html"), /koheelist@gmail\.com/);

console.log("[site] ok");
