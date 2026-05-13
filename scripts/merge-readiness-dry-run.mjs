#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_CHECKS = ["PR Validate", "Validate"];

function normalizePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function sortedUnique(values) {
  return [...new Set((values || []).map(normalizePath).filter(Boolean))].sort();
}

function stringValue(value) {
  return String(value || "").trim();
}

function checkName(check) {
  return stringValue(check?.name || check?.context || check?.check_name);
}

function checkConclusion(check) {
  return stringValue(check?.conclusion || check?.state || check?.status).toLowerCase();
}

function hasSuccessfulCheck(checks, requiredName) {
  return checks.some(
    (check) =>
      checkName(check).toLowerCase() === requiredName.toLowerCase() &&
      checkConclusion(check) === "success",
  );
}

function pendingChecks(checks) {
  return checks
    .filter((check) => ["queued", "pending", "in_progress"].includes(checkConclusion(check)))
    .map(checkName)
    .filter(Boolean);
}

function failedChecks(checks) {
  return checks
    .filter((check) => {
      const conclusion = checkConclusion(check);
      return conclusion && !["success", "skipped", "neutral"].includes(conclusion);
    })
    .map(checkName)
    .filter(Boolean);
}

function filesMatch(changedFiles, allowedFiles) {
  const changed = sortedUnique(changedFiles);
  const allowed = sortedUnique(allowedFiles);
  return (
    changed.length > 0 &&
    changed.length === allowed.length &&
    changed.every((file, index) => file === allowed[index])
  );
}

function result({ decision, reason, errors = [], evidence = {} }) {
  return {
    ok: decision === "MERGE_READY_DRY_RUN",
    decision,
    reason,
    errors,
    evidence,
    dryRun: true,
    writes: [],
    nativeAutoMergeEnabled: false,
  };
}

export function mergeReadinessDryRun(input = {}) {
  const evidence = input.pr || input;
  const errors = [];
  const risk = stringValue(evidence.risk).toUpperCase();
  const checks = evidence.checks || [];
  const changedFiles = sortedUnique(evidence.changedFiles);
  const allowedFiles = sortedUnique(evidence.allowedFiles);
  const forbiddenAreasTouched = evidence.forbiddenAreasTouched || [];
  const policyRiskOverall = stringValue(evidence.policyRiskOverall);

  for (const field of ["headSha", "expectedHeadSha", "risk", "changedFiles", "allowedFiles", "checks"]) {
    if (!evidence[field] || (Array.isArray(evidence[field]) && evidence[field].length === 0)) {
      errors.push(`missing evidence field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return result({
      decision: "FIX_REQUIRED",
      reason: "FIX_MISSING_PR_EVIDENCE",
      errors,
      evidence,
    });
  }

  if (risk === "HIGH" || risk === "HOLD") {
    return result({
      decision: "HOLD",
      reason: "HOLD_HIGH_RISK",
      errors: [`risk ${risk} requires explicit approval`],
      evidence,
    });
  }

  if (forbiddenAreasTouched.length > 0) {
    return result({
      decision: "HOLD",
      reason: "HOLD_FORBIDDEN_AREA",
      errors: [`forbidden areas touched: ${forbiddenAreasTouched.join(", ")}`],
      evidence,
    });
  }

  if (evidence.headSha !== evidence.expectedHeadSha) {
    return result({
      decision: "HOLD",
      reason: "HOLD_HEAD_SHA_CHANGED",
      errors: ["head SHA does not match expected head SHA"],
      evidence,
    });
  }

  if (!filesMatch(changedFiles, allowedFiles)) {
    return result({
      decision: "FIX_REQUIRED",
      reason: "FIX_CHANGED_FILES_OUT_OF_SCOPE",
      errors: [
        `changed files: ${changedFiles.join(", ")}`,
        `allowed files: ${allowedFiles.join(", ")}`,
      ],
      evidence,
    });
  }

  const pending = pendingChecks(checks);
  if (pending.length > 0) {
    return result({
      decision: "HOLD",
      reason: "HOLD_PENDING_CHECKS",
      errors: [`pending checks: ${pending.join(", ")}`],
      evidence,
    });
  }

  const failures = failedChecks(checks);
  if (failures.length > 0) {
    return result({
      decision: "FIX_REQUIRED",
      reason: "FIX_FAILED_CHECKS",
      errors: [`failed checks: ${failures.join(", ")}`],
      evidence,
    });
  }

  const missingChecks = REQUIRED_CHECKS.filter(
    (requiredName) => !hasSuccessfulCheck(checks, requiredName),
  );
  if (missingChecks.length > 0) {
    return result({
      decision: "FIX_REQUIRED",
      reason: "FIX_MISSING_REQUIRED_CHECKS",
      errors: [`missing successful required checks: ${missingChecks.join(", ")}`],
      evidence,
    });
  }

  if (Number(evidence.unresolvedReviewThreads || 0) > 0) {
    return result({
      decision: "HOLD",
      reason: "HOLD_REVIEW_THREADS",
      errors: [`unresolved review threads: ${evidence.unresolvedReviewThreads}`],
      evidence,
    });
  }

  if (Number(evidence.requestedChanges || 0) > 0) {
    return result({
      decision: "HOLD",
      reason: "HOLD_REQUESTED_CHANGES",
      errors: [`requested changes reviews: ${evidence.requestedChanges}`],
      evidence,
    });
  }

  if (/HIGH\/HOLD/i.test(policyRiskOverall)) {
    return result({
      decision: "HOLD",
      reason: "HOLD_POLICY_RISK",
      errors: [`policy risk result: ${policyRiskOverall}`],
      evidence,
    });
  }

  return result({
    decision: "MERGE_READY_DRY_RUN",
    reason: "ALL_EVIDENCE_GATES_PASSED",
    evidence,
  });
}

export function formatMergeReadinessReport(result) {
  const lines = [
    "Merge readiness dry-run",
    `Decision: ${result.decision}`,
    `Reason: ${result.reason}`,
    "Writes: none",
    `Native auto-merge enabled: ${result.nativeAutoMergeEnabled ? "yes" : "no"}`,
  ];

  if (result.evidence?.number) lines.push(`PR: ${result.evidence.number}`);
  if (result.evidence?.headSha) lines.push(`Head SHA: ${result.evidence.headSha}`);

  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const error of result.errors) lines.push(`  - ${error}`);
  }

  return `${lines.join("\n")}\n`;
}

function readJson(inputPath) {
  return JSON.parse(fs.readFileSync(inputPath, "utf8"));
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentFile = fileURLToPath(import.meta.url);

if (entrypoint === currentFile) {
  const [evidencePath] = process.argv.slice(2);
  const evidence = evidencePath ? readJson(evidencePath) : {};
  process.stdout.write(formatMergeReadinessReport(mergeReadinessDryRun(evidence)));
}
