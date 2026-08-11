// 소개(cafes.desc)에 섞여 들어간 거리 표기를 걷어낸다.
//
// 거리는 카드에 적는 정보가 아니다. 배지는 코드에서 지웠지만("466m" 같은 텍스트는
// 배지가 아니라) 일부 카페의 desc 값 안에 문자열로 박혀 있어서, 코드가 아니라 데이터를
// 고쳐야 한다.
//
// 기본은 DRY RUN이다. 무엇이 어떻게 바뀌는지 카페별 before/after를 먼저 찍고, --apply를
// 준 경우에만 UPDATE 한다. 프로덕션 문구를 정규식으로 일괄 수정하는 일이라 눈으로 보기
// 전에는 절대 쓰지 않는다.
//
//   node scripts/strip-desc-distance.mjs                 # 미리보기 (원격 D1)
//   node scripts/strip-desc-distance.mjs --local         # 미리보기 (로컬 D1)
//   node scripts/strip-desc-distance.mjs --apply         # 실제 반영
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const LOCAL = args.has("--local");

// 거리 토큰: 숫자 + 단위(m / km / 미터 / 킬로미터). 앞에 붙은 구분자(공백, 쉼표, 가운뎃점,
// 하이픈)까지 같이 지워야 "군자역 466m" -> "군자역"이 되고 "군자역 ," 같은 찌꺼기가
// 남지 않는다. 괄호는 여는 쪽도 닫는 쪽도 건드리지 않는다: "(466m)"은 빈 괄호 "()"가
// 되어 아래 정리 규칙이 지우고, "(군자역 466m)"은 괄호를 온전히 유지한다.
//
// 소수점을 요구하지 않고 단위 뒤에 단어경계를 두는 이유: "466m"은 잡고 "466mm"나
// "466ml"은 잡지 않기 위해서다.
//
// "천장고 5m" 같은 진짜 치수까지 잡는 건 정규식으로 못 가른다. 그래서 이 스크립트는
// 미리보기가 기본이고, 사람이 목록을 보고 판단한다.
const DISTANCE =
  /[\s,·\-–—]*\d+(?:\.\d+)?\s*(?:km|m|킬로미터|미터)(?![A-Za-z가-힣\d])/g;

// 거리를 걷어낸 뒤 남는 구두점 찌꺼기.
const LEFTOVER = [
  [/\(\s*\)/g, ""], // 빈 괄호
  [/\(\s+/g, "("], // 여는 괄호 뒤 공백
  [/\s+\)/g, ")"], // 닫는 괄호 앞 공백
  [/\s*([,·])\s*(?=[,·])/g, ""], // 연달아 남은 구분자
  [/^[\s,·\-–—]+/, ""], // 문두 구분자
  [/[\s,·\-–—]+$/, ""], // 문말 구분자
  [/\s{2,}/g, " "], // 중복 공백
];

export function stripDistance(desc) {
  let out = String(desc ?? "").replace(DISTANCE, "");
  for (const [pattern, replacement] of LEFTOVER)
    out = out.replace(pattern, replacement);
  return out.trim();
}

function d1(sql) {
  const argv = ["d1", "execute", "kohee-list", "--json"];
  argv.push(LOCAL ? "--local" : "--remote");
  argv.push("--command", sql);
  const raw = execFileSync("npx", ["wrangler", ...argv], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const parsed = JSON.parse(raw);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (block) => block?.results || [],
  );
}

function sqlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function main() {
  const rows = d1(
    "SELECT id, name, desc FROM cafes WHERE deleted_at IS NULL ORDER BY name",
  );

  const changes = rows
    .map((row) => ({ ...row, next: stripDistance(row.desc) }))
    .filter((row) => row.next !== String(row.desc ?? ""));

  if (!changes.length) {
    console.log(
      `소개에 거리 표기가 남은 카페 없음 (검사 ${rows.length}곳, ${LOCAL ? "local" : "remote"} D1).`,
    );
    return;
  }

  console.log(
    `${changes.length}곳 / 전체 ${rows.length}곳 (${LOCAL ? "local" : "remote"} D1)\n`,
  );
  for (const row of changes) {
    console.log(`  ${row.name}`);
    console.log(`    before  ${row.desc}`);
    console.log(`    after   ${row.next}`);
    if (!row.next)
      console.log("    !! 소개가 통째로 비게 된다. 적용 전에 직접 확인할 것.");
    console.log("");
  }

  if (!APPLY) {
    console.log("DRY RUN. 위 내용이 맞으면 --apply 를 붙여 다시 실행한다.");
    return;
  }

  // 소개를 통째로 비우는 건 거리 제거가 아니라 소개 삭제다. 사람이 직접 판단할 일이므로
  // 자동으로 넘기지 않는다.
  const emptied = changes.filter((row) => !row.next);
  if (emptied.length) {
    console.error(
      `중단: ${emptied.length}곳의 소개가 비게 된다 (${emptied.map((row) => row.name).join(", ")}). 해당 카페는 관리자 화면에서 직접 고친 뒤 다시 실행할 것.`,
    );
    process.exitCode = 1;
    return;
  }

  for (const row of changes) {
    d1(
      `UPDATE cafes SET desc = ${sqlQuote(row.next)}, updated_at = ${sqlQuote(new Date().toISOString())} WHERE id = ${sqlQuote(row.id)}`,
    );
    console.log(`반영  ${row.name}`);
  }
  console.log(`\n완료: ${changes.length}곳.`);
}

// D1을 건드리지 않고 stripDistance만 가져다 쓸 수 있어야 단위 테스트가 가능하다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
