const HIGH_RISK_PATH_PREFIXES = [
  "migrations/",
  ".github/workflows/",
];

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

function normalizeFile(path) {
  return String(path || "").replace(/^\/+/, "");
}

function isHighRiskPath(path) {
  const normalized = normalizeFile(path);
  if (HIGH_RISK_EXACT_PATHS.has(normalized)) return true;
  return HIGH_RISK_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
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
  const allDocs = normalizedFiles.length > 0 && normalizedFiles.every(isSafeDocsPath);
  const allTests = normalizedFiles.length > 0 && normalizedFiles.every(isSafeTestPath);
  const allTooling =
    normalizedFiles.length > 0 &&
    normalizedFiles.every((path) => isSafeToolingPath(path) || isSafeTestPath(path));

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

export function classifyPullRequest({ body = "", draft = false, files = [] } = {}) {
  const fileClassification = classifyChangedFiles(files);
  const topicMatches = detectHighRiskTopics(body);
  const risk = parseRisk(body);
  const reasons = [];

  if (draft) reasons.push("PR is draft");
  if (risk === "HIGH") reasons.push("PR body declares HIGH risk");
  if (fileClassification.hasHighRiskFiles) {
    reasons.push(
      `high-risk changed files: ${fileClassification.highRiskFiles.join(", ")}`,
    );
  }

  const safeCategory =
    fileClassification.allDocs ||
    fileClassification.allTests ||
    fileClassification.allTooling;

  if (!safeCategory) reasons.push("changed files are not docs/test/tooling-only");
  if (topicMatches.length && risk !== "LOW") {
    reasons.push("body includes high-risk topic keywords");
  }

  if (reasons.length) {
    return {
      decision: "HOLD_HIGH_RISK",
      risk,
      reasons,
      ...fileClassification,
    };
  }

  if (["LOW", "MEDIUM", "UNKNOWN"].includes(risk) && safeCategory) {
    return {
      decision: "SAFE_AUTO_MERGE_ELIGIBLE",
      risk,
      reasons: ["docs/test/tooling-only changes outside denylist"],
      ...fileClassification,
    };
  }

  return {
    decision: "OBSERVE",
    risk,
    reasons: ["no matching dry-run automation rule"],
    ...fileClassification,
  };
}

export function classifyCodexComment(body) {
  const text = String(body || "");
  const hasPrUrl = /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/i.test(
    text,
  );
  const claimsPr = /\bPR_OPEN\b|\bmake_pr\b|\bactual GitHub PR URL\b/i.test(
    text,
  );

  if (claimsPr && !hasPrUrl) {
    return {
      decision: "UNVERIFIED_PR_CLAIM",
      reasons: ["comment claims PR/publishing evidence without actual PR URL"],
    };
  }
  if (/\bHOLD_USER_APPROVAL\b/.test(text)) {
    return { decision: "HOLD_USER_APPROVAL", reasons: ["explicit HOLD_USER_APPROVAL"] };
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

  return { decision: "OBSERVE", reasons: ["no codex status marker detected"] };
}

export function decideWebhookAction(eventName, payload) {
  if (eventName === "pull_request") {
    const pullRequest = payload?.pull_request || {};
    const files = payload?.kohee?.changed_files || [];
    const classification = classifyPullRequest({
      body: pullRequest.body || "",
      draft: Boolean(pullRequest.draft),
      files,
    });
    return {
      ok: true,
      dryRun: true,
      event: `pull_request.${payload?.action || "unknown"}`,
      pullRequest: pullRequest.number || null,
      ...classification,
      wouldDo:
        classification.decision === "SAFE_AUTO_MERGE_ELIGIBLE"
          ? ["enable_native_auto_merge"]
          : ["comment_hold_or_observe"],
    };
  }

  if (eventName === "issue_comment") {
    const classification = classifyCodexComment(payload?.comment?.body || "");
    return {
      ok: true,
      dryRun: true,
      event: `issue_comment.${payload?.action || "unknown"}`,
      issue: payload?.issue?.number || null,
      ...classification,
      wouldDo:
        classification.decision === "UNVERIFIED_PR_CLAIM"
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
