#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(eventPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse GITHUB_EVENT_PATH: ${error.message}`);
  }
}

function header(title) {
  console.log(`\n[kohee-evidence] ${title}`);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function includesCurrentPrUrl(body, prUrl) {
  return String(body || "").includes(prUrl);
}

function hasPrOpenClaim(body) {
  return /\bPR_OPEN\b/.test(String(body || ""));
}

function findHeadShaClaims(body) {
  const text = String(body || "");
  const matches = [];
  const patterns = [
    /\bhead_sha\s*:\s*([0-9a-f]{7,40})\b/gi,
    /\bhead sha\s*[:=]\s*([0-9a-f]{7,40})\b/gi,
    /\bhead\s*[:=]\s*([0-9a-f]{7,40})\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) matches.push(match[1]);
  }
  return unique(matches);
}

function changedFileRisk(path) {
  if (/^migrations\//.test(path)) return "D1/schema/migration";
  if (path === "schema.sql") return "D1/schema";
  if (path === "worker.js") return "worker entrypoint";
  if (/^server\/(auth|session|users|routes|shared)\.js$/.test(path))
    return "auth/session/security/server routing";
  if (/^server\/(csv|submissions|cafes)\.js$/.test(path))
    return "CSV/lifecycle/server data behavior";
  if (/^\.github\/workflows\//.test(path)) return "workflow/governance";
  return "";
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
    const text = await response.text().catch(() => "");
    throw new Error(`GitHub API ${response.status} for ${url}: ${text}`);
  }
  return response.json();
}

async function fetchAllFiles(owner, repo, prNumber, token) {
  const files = [];
  for (let page = 1; page <= 10; page += 1) {
    const data = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
      token,
    );
    files.push(...data);
    if (data.length < 100) break;
  }
  return files;
}

async function main() {
  const event = readEvent();
  if (!event?.pull_request) {
    header("SKIP");
    console.log("No pull_request payload found. Skipping PR evidence check.");
    return;
  }

  const repository = process.env.GITHUB_REPOSITORY || event.repository?.full_name;
  const token = process.env.GITHUB_TOKEN;
  if (!repository) throw new Error("GITHUB_REPOSITORY is missing.");
  if (!token) throw new Error("GITHUB_TOKEN is missing.");

  const [owner, repo] = repository.split("/");
  const prNumber = event.pull_request.number;
  const pr = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    token,
  );
  const files = await fetchAllFiles(owner, repo, prNumber, token);

  const body = pr.body || "";
  const prUrl = pr.html_url;
  const headSha = pr.head?.sha || event.pull_request.head?.sha || "";
  const errors = [];
  const warnings = [];

  header("PR evidence");
  console.log(`PR: ${prUrl}`);
  console.log(`Head SHA: ${headSha}`);
  console.log(`Changed files: ${files.length}`);

  if (hasPrOpenClaim(body) && !includesCurrentPrUrl(body, prUrl)) {
    errors.push(
      "PR_OPEN is claimed in the PR body, but the body does not include the actual GitHub PR URL.",
    );
  }

  const headClaims = findHeadShaClaims(body);
  for (const claim of headClaims) {
    if (!headSha.startsWith(claim) && claim !== headSha) {
      errors.push(
        `PR body claims head SHA ${claim}, but actual GitHub head SHA is ${headSha}.`,
      );
    }
  }

  if (/\bmake_pr\b/i.test(body) && !includesCurrentPrUrl(body, prUrl)) {
    warnings.push(
      "PR body mentions make_pr metadata without also including the current actual PR URL.",
    );
  }

  const riskyFiles = files
    .map((file) => ({ path: file.filename, risk: changedFileRisk(file.filename) }))
    .filter((item) => item.risk);
  if (riskyFiles.length) {
    header("Risky changed files");
    for (const item of riskyFiles) console.log(`- ${item.path}: ${item.risk}`);
  }

  const highRiskFiles = riskyFiles.filter(
    (item) => !["workflow/governance"].includes(item.risk),
  );
  if (highRiskFiles.length && !/\b(HIGH|HOLD|user[- ]approved|user approval)\b/i.test(body)) {
    warnings.push(
      "High-risk files are touched, but the PR body does not clearly mention HIGH/HOLD/user approval.",
    );
  }

  if (warnings.length) {
    header("Warnings");
    for (const warning of warnings) console.warn(`WARN: ${warning}`);
  }

  if (errors.length) {
    header("FAIL");
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  header("PASS");
  console.log("GitHub evidence is consistent enough for this PR scope.");
}

main().catch((error) => {
  console.error(`[kohee-evidence] ${error.stack || error.message}`);
  process.exit(1);
});
