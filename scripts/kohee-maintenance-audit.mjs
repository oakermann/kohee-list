const REPO = process.env.GITHUB_REPOSITORY || "oakermann/kohee-list";
const TOKEN = process.env.GITHUB_TOKEN || "";
const API_VERSION = "2022-11-28";
const TERMINAL_STATES = new Set([
  "MERGED",
  "MERGED_AND_DEPLOYED",
  "DONE_NO_DEPLOY",
  "HOLD",
  "HOLD_HIGH_RISK",
  "HOLD_USER_APPROVAL",
  "SUPERSEDED",
  "STALE",
]);
const PROTECTED_BRANCHES = new Set(["main", "master"]);
const HOLD_PATTERNS = [
  /phase2/i,
  /github-app/i,
  /cloudflare/i,
  /d1/i,
  /migration/i,
  /schema/i,
  /auth/i,
  /session/i,
  /csv/i,
  /reset/i,
];

function requireToken() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is required");
}

function splitRepo(repository) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  return { owner, repo };
}

async function github(path, options = {}) {
  requireToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${TOKEN}`,
      "user-agent": "kohee-maintenance-audit",
      "x-github-api-version": API_VERSION,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} for ${path}: ${text.slice(0, 400)}`);
  }
  return response.json();
}

async function allPages(path, limit = 100) {
  const items = [];
  for (let page = 1; page <= 10 && items.length < limit; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const pageItems = await github(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    items.push(...pageItems);
    if (pageItems.length < 100) break;
  }
  return items.slice(0, limit);
}

function daysAgo(value) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

function hasHoldPattern(name) {
  return HOLD_PATTERNS.some((pattern) => pattern.test(name));
}

function bodyHasTerminalStatus(body) {
  const text = String(body || "");
  if (!text.includes("KOHEE_STATUS")) return false;
  return [...TERMINAL_STATES].some((state) => text.includes(state));
}

function classifyBranch(branch, prsByHead) {
  const name = branch.name;
  const prs = prsByHead.get(name) || [];
  if (PROTECTED_BRANCHES.has(name) || branch.protected) {
    return { branch: name, classification: "HOLD", reason: "protected branch" };
  }
  if (hasHoldPattern(name)) {
    return { branch: name, classification: "HOLD", reason: "name matches HIGH/control-plane pattern" };
  }
  const merged = prs.find((pr) => pr.merged_at);
  if (merged) {
    return {
      branch: name,
      classification: "SAFE_DELETE_CANDIDATE",
      reason: `merged PR #${merged.number}`,
      pr: merged.number,
      ageDays: daysAgo(merged.merged_at),
    };
  }
  const closed = prs.find((pr) => pr.state === "closed");
  if (closed) {
    return {
      branch: name,
      classification: "REVIEW_REQUIRED",
      reason: `closed unmerged PR #${closed.number}`,
      pr: closed.number,
      ageDays: daysAgo(closed.closed_at),
    };
  }
  return {
    branch: name,
    classification: "REVIEW_REQUIRED",
    reason: "no linked merged PR found",
    ageDays: null,
  };
}

function classifyPr(pr) {
  if (pr.draft) return { pr: pr.number, classification: "REVIEW_REQUIRED", reason: "draft PR" };
  if (pr.state === "open" && daysAgo(pr.updated_at) >= 7) {
    return { pr: pr.number, classification: "STALE_PR_CANDIDATE", reason: `updated ${daysAgo(pr.updated_at)} days ago` };
  }
  if (pr.state === "open" && /status|tracking|todo/i.test(`${pr.title}\n${pr.body || ""}`)) {
    return { pr: pr.number, classification: "STATUS_ONLY_PR_REVIEW", reason: "title/body suggests status tracking" };
  }
  return { pr: pr.number, classification: "OK_CHANGE_UNIT", reason: "no PR hygiene warning" };
}

function classifyIssue(issue) {
  if (issue.pull_request) return null;
  const body = issue.body || "";
  if (!body.includes("KOHEE_COMMAND")) return null;
  if (bodyHasTerminalStatus(body)) {
    return { issue: issue.number, classification: "TERMINAL", reason: "KOHEE_STATUS terminal in body" };
  }
  if (daysAgo(issue.updated_at) >= 3) {
    return { issue: issue.number, classification: "STALE_COMMAND_CANDIDATE", reason: `updated ${daysAgo(issue.updated_at)} days ago` };
  }
  return { issue: issue.number, classification: "ACTIVE_COMMAND", reason: "recent non-terminal command issue" };
}

function renderTable(headers, rows) {
  if (!rows.length) return "_None._\n";
  const header = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((key) => String(row[key] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, sep, ...body].join("\n") + "\n";
}

async function main() {
  const { owner, repo } = splitRepo(REPO);
  const [branches, prs, issues, runs] = await Promise.all([
    allPages(`/repos/${owner}/${repo}/branches`, 300),
    allPages(`/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc`, 200),
    allPages(`/repos/${owner}/${repo}/issues?state=open`, 200),
    allPages(`/repos/${owner}/${repo}/actions/runs?status=completed`, 50),
  ]);

  const prsByHead = new Map();
  for (const pr of prs) {
    const head = pr.head?.ref;
    if (!head) continue;
    if (!prsByHead.has(head)) prsByHead.set(head, []);
    prsByHead.get(head).push(pr);
  }

  const branchFindings = branches.map((branch) => classifyBranch(branch, prsByHead));
  const prFindings = prs.filter((pr) => pr.state === "open").map(classifyPr);
  const issueFindings = issues.map(classifyIssue).filter(Boolean);
  const failedRuns = runs
    .filter((run) => ["failure", "cancelled", "timed_out"].includes(run.conclusion))
    .slice(0, 10)
    .map((run) => ({ workflow: run.name, conclusion: run.conclusion, branch: run.head_branch, run: run.id }));

  const safeDeleteCandidates = branchFindings.filter((item) => item.classification === "SAFE_DELETE_CANDIDATE");
  const reviewRequiredBranches = branchFindings.filter((item) => item.classification === "REVIEW_REQUIRED");
  const heldBranches = branchFindings.filter((item) => item.classification === "HOLD");

  const summary = [
    "# KOHEE Maintenance Audit",
    "",
    `Repository: ${REPO}`,
    `Generated: ${new Date().toISOString()}`,
    "Mode: read-only; no branch deletion, no issue close, no auto-merge, no deploy.",
    "",
    "## Counts",
    "",
    `- branches scanned: ${branches.length}`,
    `- PRs scanned: ${prs.length}`,
    `- open command issues scanned: ${issueFindings.length}`,
    `- failed recent workflow runs: ${failedRuns.length}`,
    `- SAFE_DELETE_CANDIDATE branches: ${safeDeleteCandidates.length}`,
    `- REVIEW_REQUIRED branches: ${reviewRequiredBranches.length}`,
    `- HOLD branches: ${heldBranches.length}`,
    "",
    "## Branch cleanup candidates",
    "",
    renderTable(["branch", "classification", "reason", "pr", "ageDays"], safeDeleteCandidates.slice(0, 30)),
    "## Branches requiring review",
    "",
    renderTable(["branch", "classification", "reason", "pr", "ageDays"], reviewRequiredBranches.slice(0, 30)),
    "## Held branches",
    "",
    renderTable(["branch", "classification", "reason"], heldBranches.slice(0, 30)),
    "## Open PR hygiene",
    "",
    renderTable(["pr", "classification", "reason"], prFindings),
    "## Command issue state",
    "",
    renderTable(["issue", "classification", "reason"], issueFindings),
    "## Recent failed workflow runs",
    "",
    renderTable(["workflow", "conclusion", "branch", "run"], failedRuns),
    "",
  ].join("\n");

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await import("node:fs/promises").then((fs) => fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
