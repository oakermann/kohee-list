#!/usr/bin/env node

import process from "node:process";

const STALE_HOURS = Number(process.env.KOHEE_WATCHDOG_STALE_HOURS || 12);
const MAX_ITEMS = Number(process.env.KOHEE_WATCHDOG_MAX_ITEMS || 30);

function header(title) {
  console.log(`\n[kohee-watchdog] ${title}`);
}

function ageHours(iso) {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return (Date.now() - time) / 36e5;
}

function compact(text, max = 140) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

async function githubFetch(url, token) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub API ${response.status} for ${url}: ${body}`);
  }
  return response.json();
}

async function searchIssues(repository, token, query) {
  const encoded = encodeURIComponent(`repo:${repository} ${query}`);
  const url = `https://api.github.com/search/issues?q=${encoded}&sort=updated&order=asc&per_page=${MAX_ITEMS}`;
  const data = await githubFetch(url, token);
  return data.items || [];
}

function classifyIssue(issue) {
  const body = issue.body || "";
  const updatedAge = ageHours(issue.updated_at);
  const title = issue.title || "";
  const labels = (issue.labels || []).map((label) => label.name).join(", ");

  const isKoheeCommand = title.includes("[KOHEE_COMMAND]") || body.includes("KOHEE_COMMAND:");
  const isParallel = title.includes("KOHEE_PARALLEL_MAINTENANCE") || body.includes("KOHEE_PARALLEL_MAINTENANCE:");
  const hasCodexStatus = body.includes("KOHEE_STATUS:") || /DONE_NO_DEPLOY|HOLD|PR_OPEN|VERIFIED/.test(body);

  let state = "OBSERVE";
  const reasons = [];

  if ((isKoheeCommand || isParallel) && updatedAge !== null && updatedAge >= STALE_HOURS) {
    state = "STALE";
    reasons.push(`updated ${updatedAge.toFixed(1)}h ago`);
  }

  if ((isKoheeCommand || isParallel) && !hasCodexStatus && updatedAge !== null && updatedAge >= STALE_HOURS) {
    state = "STALE_NO_STATUS";
    reasons.push("no obvious KOHEE_STATUS terminal marker in body");
  }

  return {
    number: issue.number,
    title,
    url: issue.html_url,
    labels,
    updatedAge,
    state,
    reasons,
  };
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repository) throw new Error("GITHUB_REPOSITORY is missing.");
  if (!token) throw new Error("GITHUB_TOKEN is missing.");

  header("configuration");
  console.log(`repository=${repository}`);
  console.log(`stale_hours=${STALE_HOURS}`);
  console.log(`max_items=${MAX_ITEMS}`);

  const queries = [
    'is:issue is:open "KOHEE_COMMAND"',
    'is:issue is:open "KOHEE_PARALLEL_MAINTENANCE"',
    'is:issue is:open "KOHEE_RECOVERY_TASK"',
  ];

  const all = [];
  for (const query of queries) {
    const items = await searchIssues(repository, token, query);
    all.push(...items);
  }

  const byNumber = new Map();
  for (const issue of all) byNumber.set(issue.number, issue);
  const issues = [...byNumber.values()].sort((a, b) => a.number - b.number);

  header("open KOHEE automation issues");
  if (!issues.length) {
    console.log("No open KOHEE automation issues found.");
    return;
  }

  const classified = issues.map(classifyIssue);
  for (const issue of classified) {
    const age = issue.updatedAge === null ? "unknown" : `${issue.updatedAge.toFixed(1)}h`;
    console.log(`#${issue.number} ${issue.state} age=${age} ${compact(issue.title)}`);
    console.log(`  ${issue.url}`);
    if (issue.reasons.length) console.log(`  reasons: ${issue.reasons.join("; ")}`);
  }

  const stale = classified.filter((issue) => issue.state !== "OBSERVE");
  header("summary");
  console.log(`total=${classified.length}`);
  console.log(`stale=${stale.length}`);

  if (stale.length) {
    console.warn("WARN: stale KOHEE automation issues detected. This watchdog is read-only and did not modify issues.");
  } else {
    console.log("No stale KOHEE automation issues detected.");
  }
}

main().catch((error) => {
  console.error(`[kohee-watchdog] ${error.stack || error.message}`);
  process.exit(1);
});
