import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const USER_AGENT = "kohee-list/1.0 (candidate-checker)";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

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

  return words.some((word) => addressText.includes(word));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function queryOverpass(candidateName) {
  const escapedName = candidateName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const query = `[out:json][timeout:25];
area["ISO3166-1"="KR"]->.searchArea;
(
  node["amenity"~"cafe|coffee_shop|restaurant"](area.searchArea)[~"^name(:.*)?$"~"${escapedName}", i];
  way["amenity"~"cafe|coffee_shop|restaurant"](area.searchArea)[~"^name(:.*)?$"~"${escapedName}", i];
  node(area.searchArea)[~"^name(:.*)?$"~"${escapedName}", i];
);
out center;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.elements || !data.elements.length) return null;

    for (const elem of data.elements) {
      const tags = elem.tags || {};
      const elemName = tags.name || tags["name:en"] || tags["name:ko"] || "";
      if (matchName(candidateName, elemName)) {
        return {
          matchedName: elemName || candidateName,
          source: "Overpass",
          addressTags: tags,
          lat: elem.lat ?? elem.center?.lat ?? null,
          lon: elem.lon ?? elem.center?.lon ?? null,
        };
      }
    }
  } catch (_err) {
    // Overpass failed, fall back to Nominatim
  }
  return null;
}

async function queryNominatim(candidateName, region) {
  const q = `${candidateName} ${region}`.trim();
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=kr&limit=5`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;

    for (const item of data) {
      const itemName = item.name || item.display_name || "";
      if (matchName(candidateName, itemName)) {
        return {
          matchedName: item.name || item.display_name,
          source: "Nominatim",
          addressTags: item.address || item.display_name,
          lat: item.lat ? parseFloat(item.lat) : null,
          lon: item.lon ? parseFloat(item.lon) : null,
        };
      }
    }
  } catch (_err) {
    // Nominatim failed
  }
  return null;
}

function formatAddress(addressTags) {
  if (!addressTags) return "N/A";
  if (typeof addressTags === "string") return addressTags;
  if (typeof addressTags === "object") {
    const parts = [];
    if (addressTags.province) parts.push(addressTags.province);
    if (addressTags.city) parts.push(addressTags.city);
    if (addressTags.city_district) parts.push(addressTags.city_district);
    if (addressTags.suburb) parts.push(addressTags.suburb);
    if (addressTags.road) parts.push(addressTags.road);
    if (addressTags["addr:city"]) parts.push(addressTags["addr:city"]);
    if (addressTags["addr:district"]) parts.push(addressTags["addr:district"]);
    if (addressTags["addr:street"]) parts.push(addressTags["addr:street"]);

    if (parts.length > 0) return parts.join(" ");
    return Object.entries(addressTags)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(addressTags);
}

export async function runCandidateCheck() {
  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, "docs", "cafe-candidates.json");
  const outputPath = path.join(rootDir, "docs", "cafe-candidate-report.md");

  const raw = await readFile(inputPath, "utf8");
  const candidates = JSON.parse(raw);

  const found = [];
  const doubtful = [];
  const notFound = [];

  for (const candidate of candidates) {
    let hit = null;

    // Try Overpass
    await sleep(2000);
    hit = await queryOverpass(candidate.name);

    // Fall back to Nominatim if needed
    if (!hit) {
      await sleep(2000);
      hit = await queryNominatim(candidate.name, candidate.region);
    }

    if (hit) {
      const regionMatch = checkRegionMatch(candidate.region, hit.addressTags);
      const record = {
        name: candidate.name,
        expectedRegion: candidate.region,
        matchedName: hit.matchedName,
        source: hit.source,
        addressTags: hit.addressTags,
        formattedAddress: formatAddress(hit.addressTags),
        lat: hit.lat,
        lon: hit.lon,
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

  let report = `# Cafe Candidate Search Report\n\n`;
  report += `## Summary\n`;
  report += `- Total Candidates: ${candidates.length}\n`;
  report += `- Found: ${found.length}\n`;
  report += `- Doubtful: ${doubtful.length}\n`;
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
      report += `   - Address: ${item.formattedAddress}\n`;
      report += `   - Coordinates: ${item.lat}, ${item.lon}\n\n`;
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
      report += `   - Address: ${item.formattedAddress}\n`;
      report += `   - Coordinates: ${item.lat}, ${item.lon}\n`;
      report += `   - Reason: Address does not match expected region "${item.expectedRegion}"\n\n`;
    });
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

  await writeFile(outputPath, report, "utf8");

  console.log("Candidate Search Summary:");
  console.log(`Total Candidates: ${candidates.length}`);
  console.log(`Found: ${found.length}`);
  console.log(`Doubtful: ${doubtful.length}`);
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
