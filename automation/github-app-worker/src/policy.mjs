const HIGH_RISK_PATH_PREFIXES = ["migrations/", ".github/workflows/"];

const HIGH_RISK_EXACT_PATHS = new Set([
  "schema.sql",
  "wrangler.toml",
  "worker.js",
  "server/auth.js",
  "server/security.js",
]);

const HIGH_RISK_TOPIC_PATTERNS = [
  /\bD1\b/i,
  /schema/i,
  /migration/i,
  /auth/i,
  /session/i,
  /secret/i,
  /csrf/i,
  /cookie/i,
  /password/i,
  /role/i,
  /permission/i,
  /public\s+\/data/i,
  /public\s+api/i,
  /CSV\s+import/i,
  /CSV\s+reset/i,
  /destructive/i,
  /deploy/i,
  /manager\s+role/i,
];

const SAFE_DOC_PREFIXES = ["docs/", ".github/ISSUE_TEMPLATE/"];
const SAFE_TEST_PREFIXES = ["test/", "tests/", "scripts/test-"];
const SAFE_TOOLING_PREFIXES = ["scripts/", "automation/github-app-worker/"];

const STATUS_STATES = new Set([
  "QUEUED",
  "QUEUED_STALE",
  "WORKING",
  "PR_OPEN",
  "REVIEWING",
  "FIXING",
  "DEPLOYING",
  "MERGED_AND_DEPLOYED",
  "DONE_NO_DEPLOY",
  "HOLD",
]);

const STATUS_RISKS = new Set(["LOW", "MEDIUM", "HIGH"]);

const STATUS_LANES = new Set([
  "GOVERNANCE",
  "DEPLOY_SAFETY",
  "PUBLIC_EXPOSURE",
  "AUTH_ROLE",
  "LIFECYCLE",
  "CSV_PIPELINE",
  "FRONTEND_RENDERING",
]);

const STATUS_HOLD_BLOCKERS = new Set([
  "HOLD_HIGH_RISK",
  "HOLD_USER_APPROVAL",
  "HOLD_DEPLOY_BLOCKED",
  "HOLD_SECRET_OR_PERMISSION",
  "HOLD_PRODUCT_DIRECTION",
  "HOLD_SCOPE_CONFLICT",
  "HOLD_VERIFICATION_CONFLICT",
  "HOLD_REPEATED_FAILURE",
  "HOLD_CODEX_NO_RESPONSE",
  "HOLD_CODEX_PR_PUBLISHING",
]);

const STATUS_ISSUE_ALLOWLIST = new Set([23]);
const REPO_PR_URL =
  /^https:\/\/github\.com\/oakermann\/kohee-list\/pull\/(\d+)$/i;
const AUTO_MERGE_MODES = new Set([
  "docs-only",
  "tooling-only",
  "audit-only",
  "test-only",
]);
const REQUIRED_AUTO_MERGE_CHECKS = ["pr-validate", "verify"];
const AUTO_MERGE_ALLOWED_HEAD_REPOS = new Set(["oakermann/kohee-list"]);

function normalizeFile(path) {
  return String(path || "").replace(/^\/+/, "");
}

function isHighRiskPath(path) {
  const normalized = normalizeFile(path);
  if (HIGH_RISK_EXACT_PATHS.has(normalized)) return true;
  return HIGH_RISK_PATH_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function isSafeDocsPath(path) {
  const normalized = normalizeFile(path);
  return (
    normalized.endsWith(".md") ||
    SAFE_DOC_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

function isSafeTestPath(path) {
  const normalized = normalizeFile(path);
  return SAFE_TEST_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isSafeToolingPath(path) {
  const normalized = normalizeFile(path);
  return SAFE_TOOLING_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function classifyChangedFiles(files = []) {
  const normalizedFiles = files.map(normalizeFile).filter(Boolean);
  const highRiskFiles = normalizedFiles.filter(isHighRiskPath);
  const allDocs =
    normalizedFiles.length > 0 && normalizedFiles.every(isSafeDocsPath);
  const allTests =
    normalizedFiles.length > 0 && normalizedFiles.every(isSafeTestPath);
  const allTooling =
    normalizedFiles.length > 0 &&
    normalizedFiles.every(
      (path) => isSafeToolingPath(path) || isSafeTestPath(path),
    );

  return {
    files: normalizedFiles,
    highRiskFiles,
    hasHighRiskFiles: highRiskFiles.length > 0,
    allDocs,
    allTests,
    allTooling,
  };
}

export function detectHighRiskTopics(text) {
  const value = String(text || "");
  return HIGH_RISK_TOPIC_PATTERNS.filter((pattern) => pattern.test(value)).map(
    (pattern) => String(pattern),
  );
}

export function parseRisk(text) {
  const value = String(text || "");
  if (/\bHIGH\b/.test(value)) return "HIGH";
  if (/\bMEDIUM\b/.test(value)) return "MEDIUM";
  if (/\bLOW\b/.test(value)) return "LOW";
  return "UNKNOWN";
}

function checkName(check) {
  return String(check?.name || check?.context || check?.check_name || "");
}

function checkConclusion(check) {
  return String(check?.conclusion || check?.state || check?.status || "");
}

function hasSuccessfulCheck(checks, requiredName) {
  return checks.some(
    (check) =>
      checkName(check).toLowerCase() === requiredName.toLowerCase() &&
      checkConclusion(check).toLowerCase() === "success",
  );
}

function failedChecks(checks) {
  return checks
    .filter((check) => {
      const conclusion = checkConclusion(check).toLowerCase();
      return (
        conclusion && !["success", "skipped", "neutral"].includes(conclusion)
      );
    })
    .map(checkName)
    .filter(Boolean);
}

function matchesDeclaredMode(mode, fileClassification) {
  if (mode === "docs-only") return fileClassification.allDocs;
  if (mode === "test-only") return fileClassification.allTests;
  if (mode === "tooling-only") return fileClassification.allTooling;
  if (mode === "audit-only") {
    return (
      fileClassification.allDocs ||
      fileClassification.allTests ||
      fileClassification.allTooling
    );
  }
  return false;
}

export function classifyPullRequest({
  body = "",
  draft = false,
  files = [],
  baseRef = "main",
  headRepo = "oakermann/kohee-list",
  headSha = "",
  mergeable = true,
  checks = [],
  unresolvedReviewThreads = 0,
  requestedChanges = 0,
} = {}) {
  const fileClassification = classifyChangedFiles(files);
  const topicMatches = detectHighRiskTopics(body);
  const status = parseKoheeStatusBlock(body);
  const risk = status?.risk || parseRisk(body);
  const mode = status?.mode || "";
  const reasons = [];

  if (draft) reasons.push("PR is draft");
  if (!status) {
    return {
      decision: "AUTO_MERGE_OBSERVE",
      risk,
      mode,
      reasons: ["PR body does not contain KOHEE_STATUS"],
      ...fileClassification,
    };
  }
  if (baseRef !== "main") reasons.push(`base branch is not main: ${baseRef}`);
  if (!AUTO_MERGE_ALLOWED_HEAD_REPOS.has(headRepo)) {
    reasons.push(`head repository is not allowed: ${headRepo || "(missing)"}`);
  }
  if (mergeable === false) reasons.push("PR is not mergeable");
  if (risk === "UNKNOWN") reasons.push("KOHEE_STATUS risk is missing");
  if (risk !== "LOW")
    reasons.push("auto-merge dry-run eligibility is LOW-only");
  if (!status.lane) reasons.push("KOHEE_STATUS lane is missing");
  if (!AUTO_MERGE_MODES.has(mode)) {
    reasons.push(`unsupported KOHEE_STATUS mode: ${mode || "(missing)"}`);
  }
  if (!status.head_sha) reasons.push("KOHEE_STATUS head_sha is missing");
  if (headSha && status.head_sha && headSha !== status.head_sha) {
    reasons.push(`KOHEE_STATUS head_sha does not match actual head SHA`);
  }
  if (fileClassification.hasHighRiskFiles) {
    reasons.push(
      `high-risk changed files: ${fileClassification.highRiskFiles.join(", ")}`,
    );
  }

  const safeCategory =
    fileClassification.allDocs ||
    fileClassification.allTests ||
    fileClassification.allTooling;

  if (!safeCategory)
    reasons.push("changed files are not docs/test/tooling-only");
  if (
    AUTO_MERGE_MODES.has(mode) &&
    !matchesDeclaredMode(mode, fileClassification)
  ) {
    reasons.push(`changed files do not match declared mode: ${mode}`);
  }
  if (topicMatches.length) {
    reasons.push("body includes high-risk topic keywords");
  }
  const missingChecks = REQUIRED_AUTO_MERGE_CHECKS.filter(
    (requiredName) => !hasSuccessfulCheck(checks, requiredName),
  );
  if (missingChecks.length) {
    reasons.push(
      `missing successful required checks: ${missingChecks.join(", ")}`,
    );
  }
  const failures = failedChecks(checks);
  if (failures.length) reasons.push(`failing checks: ${failures.join(", ")}`);
  if (Number(unresolvedReviewThreads) > 0) {
    return {
      decision: "AUTO_MERGE_HOLD",
      risk,
      mode,
      reasons: [`unresolved review threads: ${unresolvedReviewThreads}`],
      ...fileClassification,
    };
  }
  if (Number(requestedChanges) > 0) {
    return {
      decision: "AUTO_MERGE_HOLD",
      risk,
      mode,
      reasons: [`requested changes reviews: ${requestedChanges}`],
      ...fileClassification,
    };
  }

  if (reasons.length) {
    return {
      decision: "AUTO_MERGE_REJECT",
      risk,
      mode,
      reasons,
      ...fileClassification,
    };
  }

  return {
    decision: "AUTO_MERGE_ELIGIBLE_DRY_RUN",
    risk,
    mode,
    reasons: [
      "LOW KOHEE_STATUS with successful required checks and no review blockers",
    ],
    ...fileClassification,
  };
}

export function classifyCodexComment(body) {
  const text = String(body || "");
  const hasPrUrl = /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/i.test(
    text,
  );

  if (/\bHOLD_USER_APPROVAL\b/.test(text)) {
    return {
      decision: "HOLD_USER_APPROVAL",
      reasons: ["explicit HOLD_USER_APPROVAL"],
    };
  }
  if (/\bHOLD_HIGH_RISK\b/.test(text)) {
    return { decision: "HOLD_HIGH_RISK", reasons: ["explicit HOLD_HIGH_RISK"] };
  }
  if (/\bPATCH_READY\b/.test(text)) {
    return { decision: "PATCH_READY", reasons: ["explicit PATCH_READY"] };
  }
  if (/\bDONE_NO_DEPLOY\b/.test(text)) {
    return { decision: "DONE_NO_DEPLOY", reasons: ["explicit DONE_NO_DEPLOY"] };
  }
  if (/\bPR_OPEN\b/.test(text) && !hasPrUrl) {
    return {
      decision: "UNVERIFIED_PR_CLAIM",
      reasons: ["comment claims PR_OPEN without actual PR URL"],
    };
  }

  return { decision: "OBSERVE", reasons: ["no codex status marker detected"] };
}

function scalar(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function parseKoheeStatusBlock(body) {
  const lines = String(body || "").split(/\r?\n/);
  const markerIndex = lines.findIndex((line) =>
    /^\s*KOHEE_STATUS\s*:\s*$/.test(line),
  );
  if (markerIndex < 0) return null;

  const status = {};
  let parent = null;
  for (const line of lines.slice(markerIndex + 1)) {
    if (!line.trim()) continue;
    if (/^\S/.test(line)) break;

    const match = line.match(/^\s{2,}([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent <= 2) {
      parent = key;
      if (value.trim()) status[key] = scalar(value);
      continue;
    }

    if (parent === "evidence" && key === "pr_url") {
      status.pr_url = scalar(value);
    }
  }

  return status;
}

function rejectStatus(reason, status = {}) {
  return {
    decision: "REJECT",
    status,
    reasons: [reason],
  };
}

export function classifyKoheeStatusComment(body, issueNumber) {
  const status = parseKoheeStatusBlock(body);
  if (!status) {
    return {
      decision: "OBSERVE",
      reasons: ["no kohee status marker detected"],
    };
  }

  if (!STATUS_ISSUE_ALLOWLIST.has(Number(issueNumber))) {
    return rejectStatus(
      "issue is not allowed for KOHEE_STATUS recording",
      status,
    );
  }

  if (!STATUS_STATES.has(status.state)) {
    return rejectStatus(
      `unsupported KOHEE_STATUS state: ${status.state || "(missing)"}`,
      status,
    );
  }
  if (!STATUS_RISKS.has(status.risk)) {
    return rejectStatus(
      `unsupported KOHEE_STATUS risk: ${status.risk || "(missing)"}`,
      status,
    );
  }
  if (!STATUS_LANES.has(status.lane)) {
    return rejectStatus(
      `unsupported KOHEE_STATUS lane: ${status.lane || "(missing)"}`,
      status,
    );
  }
  if (status.blocker && !STATUS_HOLD_BLOCKERS.has(status.blocker)) {
    return rejectStatus(
      `unsupported KOHEE_STATUS blocker: ${status.blocker}`,
      status,
    );
  }

  const prUrl = status.pr_url || status.active_pr || "";
  if (status.state === "PR_OPEN" && !prUrl) {
    return rejectStatus(
      "PR_OPEN requires active_pr or evidence.pr_url",
      status,
    );
  }
  if (prUrl && !REPO_PR_URL.test(prUrl)) {
    return rejectStatus("PR URL must belong to oakermann/kohee-list", status);
  }

  return {
    decision: "RECORD_STATUS_DRY_RUN",
    status,
    reasons: ["accepted KOHEE_STATUS marker"],
  };
}

function isUnsupportedIssueStatusRejection(classification) {
  return (
    classification?.decision === "REJECT" &&
    classification.reasons?.some((reason) =>
      /issue is not allowed for KOHEE_STATUS recording/.test(reason),
    )
  );
}

export function decideWebhookAction(eventName, payload) {
  if (eventName === "pull_request") {
    const pullRequest = payload?.pull_request || {};
    const files = payload?.kohee?.changed_files || [];
    const classification = classifyPullRequest({
      body: pullRequest.body || "",
      draft: Boolean(pullRequest.draft),
      files,
      baseRef: pullRequest.base?.ref || "main",
      headRepo: pullRequest.head?.repo?.full_name || "oakermann/kohee-list",
      headSha: pullRequest.head?.sha || "",
      mergeable: pullRequest.mergeable,
      checks: payload?.kohee?.checks || [],
      unresolvedReviewThreads: payload?.kohee?.unresolved_review_threads || 0,
      requestedChanges: payload?.kohee?.requested_changes || 0,
    });
    return {
      ok: true,
      dryRun: true,
      event: `pull_request.${payload?.action || "unknown"}`,
      pullRequest: pullRequest.number || null,
      ...classification,
      wouldDo:
        classification.decision === "AUTO_MERGE_ELIGIBLE_DRY_RUN"
          ? ["enable_native_auto_merge"]
          : ["comment_hold_or_observe"],
    };
  }

  if (eventName === "issue_comment") {
    if (payload?.action !== "created") {
      return {
        ok: true,
        dryRun: true,
        event: `issue_comment.${payload?.action || "unknown"}`,
        issue: payload?.issue?.number || null,
        decision: "OBSERVE",
        reasons: ["unsupported issue_comment action"],
        wouldDo: [],
      };
    }

    const commentBody = payload?.comment?.body || "";
    const statusClassification = classifyKoheeStatusComment(
      commentBody,
      payload?.issue?.number,
    );
    const legacyClassification = classifyCodexComment(commentBody);
    const isLegacyStatusShape =
      !statusClassification.status?.risk && !statusClassification.status?.lane;
    const classification =
      statusClassification.decision === "OBSERVE"
        ? legacyClassification
        : statusClassification.decision === "REJECT" &&
            legacyClassification.decision !== "OBSERVE" &&
            isLegacyStatusShape &&
            !isUnsupportedIssueStatusRejection(statusClassification)
          ? legacyClassification
          : statusClassification;
    return {
      ok: true,
      dryRun: true,
      event: `issue_comment.${payload?.action || "unknown"}`,
      issue: payload?.issue?.number || null,
      ...classification,
      wouldDo:
        classification.decision === "RECORD_STATUS_DRY_RUN"
          ? ["record_status_dry_run"]
          : classification.decision === "UNVERIFIED_PR_CLAIM"
            ? ["comment_unverified_pr_claim"]
            : ["record_status"],
    };
  }

  return {
    ok: true,
    dryRun: true,
    event: eventName || "unknown",
    decision: "OBSERVE",
    reasons: ["event not handled in dry-run skeleton"],
    wouldDo: [],
  };
}
