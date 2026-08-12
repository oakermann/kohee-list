// "군자역에서 466m"을 소개(cafes.desc)에서 빼내 제 칸(region / region_distance_m)으로
// 옮긴다.
//
// 그 정보는 쓸모가 있다. 버리는 게 아니라 둘 곳이 없어서 사람이 읽는 문장 안에 들어가
// 있었을 뿐이다. 소개는 데이터 보관함이 아니므로 값은 백데이터 칸으로 옮기고 문장에서는
// 뺀다.
//
// 규칙은 하나다: **옮긴 것만 지운다.** 지역명을 못 찾으면 그 카페의 소개는 한 글자도
// 건드리지 않는다. "천장고 5m" 같은 진짜 치수를 거리로 오인해 지우는 사고가 이 규칙
// 하나로 막힌다 -- 어느 역까지인지 모르는 숫자는 애초에 옮길 수 없으므로 지울 이유도
// 없다.
//
// 기본은 DRY RUN이다. 카페별로 소개가 어떻게 바뀌고 어떤 값이 어느 칸에 들어가는지 먼저
// 찍고, --apply를 준 경우에만 UPDATE 한다.
//
//   node scripts/move-desc-distance-to-backdata.mjs           # 미리보기 (원격 D1)
//   node scripts/move-desc-distance-to-backdata.mjs --local   # 미리보기 (로컬 D1)
//   node scripts/move-desc-distance-to-backdata.mjs --apply   # 실제 반영
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const LOCAL = args.has("--local");

// 옮길 수 있는 한 덩어리: <지역명><연결어?><거리>.
//
// 지역명과 거리가 한 쌍으로 잡혀야만 매치되므로, 거리 숫자만 떠 있는 문장은 여기 걸리지
// 않는다. 연결어("에서", "부터", "도보", "걸어서")와 앞뒤 구분자·괄호까지 한 번에 먹어야
// 지운 자리에 "(군자역에서)" 같은 찌꺼기가 남지 않는다.
//
// 단위 뒤 부정형 전방탐색은 "466m"은 잡고 "466ml"/"466mm"는 넘기기 위한 것이다.
const PHRASE =
  /[\s,·\-–—]*\(?\s*([가-힣A-Za-z0-9]+(?:역|동|가|로|공원|사거리))(?:에서|부터)?\s*(?:도보|걸어서)?\s*(\d+(?:\.\d+)?)\s*(km|m|킬로미터|미터)(?![A-Za-z가-힣\d])\s*\)?/;

// 덩어리를 들어낸 뒤 남는 구두점 찌꺼기.
const LEFTOVER = [
  [/\(\s*\)/g, ""], // 빈 괄호
  [/\(\s+/g, "("], // 여는 괄호 뒤 공백
  [/\s+\)/g, ")"], // 닫는 괄호 앞 공백
  [/\s*([,·])\s*(?=[,·])/g, ""], // 연달아 남은 구분자
  [/^[\s,·\-–—]+/, ""], // 문두 구분자
  [/[\s,·\-–—]+$/, ""], // 문말 구분자
  [/\s{2,}/g, " "], // 중복 공백
];

function toMeters(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(
    unit === "km" || unit === "킬로미터" ? number * 1000 : number,
  );
}

// 소개에서 옮길 덩어리를 찾는다. 옮길 게 없으면 null: 호출부는 그 카페를 건너뛴다.
// 덩어리가 여럿이어도 첫 번째만 쓴다 -- 역이 여럿 붙은 카페의 대표 역을 기계가 고를 수는
// 없고, 나머지는 소개에 그대로 남아 사람 눈에 띈다.
export function moveDistanceToBackdata(desc) {
  const text = String(desc ?? "");
  const match = PHRASE.exec(text);
  if (!match) return null;

  const meters = toMeters(match[2], match[3]);
  if (!meters) return null;

  let next =
    text.slice(0, match.index) + text.slice(match.index + match[0].length);
  for (const [pattern, replacement] of LEFTOVER)
    next = next.replace(pattern, replacement);

  return {
    region: match[1],
    region_distance_m: meters,
    desc: next.trim(),
  };
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
    "SELECT id, name, desc, region, region_distance_m FROM cafes WHERE deleted_at IS NULL ORDER BY name",
  );

  const changes = rows
    .map((row) => ({ row, moved: moveDistanceToBackdata(row.desc) }))
    .filter((entry) => entry.moved);

  const where = LOCAL ? "local" : "remote";
  if (!changes.length) {
    console.log(
      `소개에서 옮길 거리 표기 없음 (검사 ${rows.length}곳, ${where} D1).`,
    );
    return;
  }

  console.log(`${changes.length}곳 / 전체 ${rows.length}곳 (${where} D1)\n`);
  for (const { row, moved } of changes) {
    console.log(`  ${row.name}`);
    console.log(`    소개   ${row.desc}`);
    console.log(`      ->   ${moved.desc}`);
    console.log(
      `    백데이터  region=${moved.region}  region_distance_m=${moved.region_distance_m}`,
    );
    // 이미 값이 있는 칸을 말없이 덮어쓰지 않는다.
    if (row.region && row.region !== moved.region)
      console.log(`    !! region 이 이미 "${row.region}" 이다. 덮어쓴다.`);
    if (!moved.desc)
      console.log("    !! 소개가 통째로 비게 된다. 적용 전에 직접 확인할 것.");
    console.log("");
  }

  if (!APPLY) {
    console.log("DRY RUN. 위 내용이 맞으면 --apply 를 붙여 다시 실행한다.");
    return;
  }

  // 소개를 통째로 비우는 건 옮기기가 아니라 소개 삭제다. 사람이 판단할 일이다.
  const emptied = changes.filter(({ moved }) => !moved.desc);
  if (emptied.length) {
    console.error(
      `중단: ${emptied.length}곳의 소개가 비게 된다 (${emptied.map(({ row }) => row.name).join(", ")}). 관리자 화면에서 직접 고친 뒤 다시 실행할 것.`,
    );
    process.exitCode = 1;
    return;
  }

  for (const { row, moved } of changes) {
    d1(
      `UPDATE cafes SET desc = ${sqlQuote(moved.desc)}, region = ${sqlQuote(moved.region)}, region_distance_m = ${moved.region_distance_m}, updated_at = ${sqlQuote(new Date().toISOString())} WHERE id = ${sqlQuote(row.id)}`,
    );
    console.log(`반영  ${row.name}`);
  }
  console.log(`\n완료: ${changes.length}곳.`);
}

// D1을 건드리지 않고 moveDistanceToBackdata만 가져다 쓸 수 있어야 단위 테스트가 가능하다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
