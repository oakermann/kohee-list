// Static screen check: do the ids the page JS looks for exist in its HTML, privacy policy link, header promises.
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const PAGES = ["index", "mypage", "submit", "admin"];

for (const page of PAGES) {
  const html = read(`site/${page}.html`);
  const js = read(`site/assets/${page}.js`);
  const ids = new Set([...html.matchAll(/\sid="([\w-]+)"/g)].map((m) => m[1]));
  // If JS looks for a deleted id, the screen stops on null (10/20 csv-reset incident).
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
// Blocking location kills 'near me' entirely in Chrome/Edge on desktop (10/21).
assert.match(headers, /geolocation=\(self\)/);
assert.match(headers, /\/assets\/\*\n {2}Cache-Control: no-cache/);
assert.match(read("site/privacy.html"), /koheelist@gmail\.com/);

console.log("[site] ok");
