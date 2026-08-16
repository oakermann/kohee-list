import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const NAVER_LOCAL_SEARCH_URL =
  "https://openapi.naver.com/v1/search/local.json";

export function normalizeName(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/\s+/g, "").trim();
}

export function matchName(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (!n1 || !n2) return false;
  if (n1.length <= 3 || n2.length <= 3) {
    return n1 === n2;
  }
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

const REGION_ALIASES = {
  seodaemun: "서대문",
  yeonhui: "연희",
  mapo: "마포",
  hapjeong: "합정",
  mangwon: "망원",
  dongjak: "동작",
  sadang: "사당",
  seongbuk: "성북",
  yangcheon: "양천",
  sinjeong: "신정",
  pyeongtaek: "평택",
  busan: "부산",
  cheongju: "청주",
  gwangju: "광주",
  suwan: "수완",
  donghae: "동해",
  mukho: "묵호",
  jeju: "제주",
  seogwipo: "서귀포",
  seoul: "서울",
  yongsan: "용산",
  jung: "중",
};

export function checkRegionMatch(expectedRegion, addressData) {
  if (!expectedRegion) return true;
  if (!addressData) return false;

  const addressText = (
    typeof addressData === "string" ? addressData : JSON.stringify(addressData)
  ).toLowerCase();

  const expectedLower = expectedRegion.toLowerCase();
  if (addressText.includes(expectedLower)) return true;

  const words = expectedLower
    .split(/[\s,/-]+/)
    .map((w) => w.replace(/-(gu|dong|si|ri|eup|myeon)$/i, "").trim())
    .filter((w) => w.length > 1);

  if (words.length === 0) return true;

  return words.some(
    (word) =>
      addressText.includes(word) ||
      (REGION_ALIASES[word] && addressText.includes(REGION_ALIASES[word]))
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function queryNaver(candidate, clientId, clientSecret) {
  if (!clientId || !clientSecret) return null;

  const candidateName = typeof candidate === "string" ? candidate : candidate.name;
  const candidateKo = typeof candidate === "object" ? candidate.name_ko : null;

  const queriesToTry = [];
  if (candidateKo && candidateKo !== candidateName) {
    queriesToTry.push(candidateKo);
  }
  queriesToTry.push(candidateName);

  let lastError = null;

  for (const q of queriesToTry) {
    const url = `${NAVER_LOCAL_SEARCH_URL}?display=5&query=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
        continue;
      }
      const data = await res.json();
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        continue;
      }

      for (const item of data.items) {
        const rawTitle = item.title || "";
        const placeName = rawTitle.replace(/<[^>]*>/g, "");
        const matchesMain = matchName(candidateName, placeName);
        const matchesKo = candidateKo ? matchName(candidateKo, placeName) : false;

        if (matchesMain || matchesKo) {
          const roadAddr = item.roadAddress || item.address || "N/A";
          return {
            matchedName: placeName,
            source: "Naver",
            roadAddress: roadAddr,
            address: roadAddr,
            lat: item.mapy ? parseFloat(item.mapy) / 1e7 : null,
            lng: item.mapx ? parseFloat(item.mapx) / 1e7 : null,
            lon: item.mapx ? parseFloat(item.mapx) / 1e7 : null,
            placeUrl: item.link || "",
          };
        }
      }
    } catch (err) {
      lastError = err?.message || String(err);
    }
  }

  if (lastError) {
    return { error: lastError };
  }

  return null;
}

export function buildReport({ candidatesCount, found, doubtful, couldNotCheck, notFound }) {
  let report = `# Cafe Candidate Search Report\n\n`;

  if (couldNotCheck.length > 0) {
    report += `> **Warning:** This run is incomplete because one or more lookups failed and must not be read as a verdict on those candidates.\n\n`;
  }

  report += `## Summary\n`;
  report += `- Total Candidates: ${candidatesCount}\n`;
  report += `- Found: ${found.length}\n`;
  report += `- Doubtful: ${doubtful.length}\n`;
  report += `- Could Not Check: ${couldNotCheck.length}\n`;
  report += `- Not Found: ${notFound.length}\n\n`;

  report += `## Found\n`;
  if (found.length === 0) {
    report += `None.\n\n`;
  } else {
    found.forEach((item, idx) => {
      report += `${idx + 1}. **${item.name}**\n`;
      report += `   - Expected Region: ${item.expectedRegion}\n`;
      report += `   - Matched Name: ${item.matchedName}\n`;
      report += `   - Source: ${item.source}\n`;
      report += `   - Road Address: ${item.roadAddress}\n`;
      report += `   - Coordinates: ${item.lat}, ${item.lng}\n`;
      report += `   - Place URL: ${item.placeUrl}\n\n`;
    });
  }

  report += `## Doubtful\n`;
  if (doubtful.length === 0) {
    report += `None.\n\n`;
  } else {
    doubtful.forEach((item, idx) => {
      report += `${idx + 1}. **${item.name}**\n`;
      report += `   - Expected Region: ${item.expectedRegion}\n`;
      report += `   - Matched Name: ${item.matchedName}\n`;
      report += `   - Source: ${item.source}\n`;
      report += `   - Road Address: ${item.roadAddress}\n`;
      report += `   - Coordinates: ${item.lat}, ${item.lng}\n`;
      report += `   - Place URL: ${item.placeUrl}\n`;
      report += `   - Reason: Address does not match expected region "${item.expectedRegion}"\n\n`;
    });
  }

  report += `## Could Not Check\n`;
  if (couldNotCheck.length === 0) {
    report += `None.\n\n`;
  } else {
    couldNotCheck.forEach((item, idx) => {
      report += `${idx + 1}. **${item.name}** (Region: ${item.expectedRegion}) - Error: ${item.error}\n`;
    });
    report += `\n`;
  }

  report += `## Not Found\n`;
  if (notFound.length === 0) {
    report += `None.\n\n`;
  } else {
    notFound.forEach((item, idx) => {
      report += `${idx + 1}. **${item.name}** (Region: ${item.expectedRegion})\n`;
    });
    report += `\n`;
  }

  return report;
}

export async function runCandidateCheck() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[ERROR] NAVER_CLIENT_ID or NAVER_CLIENT_SECRET environment variable is missing.");
    console.error("Please set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET environment variables to run cafe candidate check.");
    process.exitCode = 1;
    return;
  }

  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, "docs", "cafe-candidates.json");
  const outputPath = path.join(rootDir, "docs", "cafe-candidate-report.md");

  const raw = await readFile(inputPath, "utf8");
  const candidates = JSON.parse(raw);

  const found = [];
  const doubtful = [];
  const couldNotCheck = [];
  const notFound = [];

  for (const candidate of candidates) {
    await sleep(100);
    const hit = await queryNaver(candidate, clientId, clientSecret);

    if (hit && hit.error) {
      couldNotCheck.push({
        name: candidate.name,
        expectedRegion: candidate.region,
        error: hit.error,
      });
    } else if (hit) {
      const regionMatch = checkRegionMatch(candidate.region, hit.roadAddress);
      const record = {
        name: candidate.name,
        expectedRegion: candidate.region,
        matchedName: hit.matchedName,
        source: hit.source,
        roadAddress: hit.roadAddress,
        address: hit.address,
        lat: hit.lat,
        lng: hit.lng,
        lon: hit.lon,
        placeUrl: hit.placeUrl,
        regionMatched: regionMatch,
      };

      if (regionMatch) {
        found.push(record);
      } else {
        doubtful.push(record);
      }
    } else {
      notFound.push({
        name: candidate.name,
        expectedRegion: candidate.region,
      });
    }
  }

  const report = buildReport({
    candidatesCount: candidates.length,
    found,
    doubtful,
    couldNotCheck,
    notFound,
  });

  await writeFile(outputPath, report, "utf8");

  console.log("Candidate Search Summary:");
  console.log(`Total Candidates: ${candidates.length}`);
  console.log(`Found: ${found.length}`);
  console.log(`Doubtful: ${doubtful.length}`);
  console.log(`Could Not Check: ${couldNotCheck.length}`);
  console.log(`Not Found: ${notFound.length}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runCandidateCheck().catch((err) => {
    console.error("Candidate check script failed:", err);
    process.exitCode = 1;
  });
}
