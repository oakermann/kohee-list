#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_FLOW_STEPS = [
  "taskEnqueue",
  "evidenceObserve",
  "mergeDecision",
  "reporting",
];

const FORBIDDEN_ACTIONS = [
  "issueCommentWrite",
  "prMerge",
  "secrets",
  "deploy",
  "nativeAutoMerge",
  "unattendedLoop",
];

function scalar(value) {
  return String(value ?? "").trim();
}

function list(value) {
  return Array.isArray(value) ? value.map(scalar).filter(Boolean) : [];
}

function stepWrites(step) {
  return step?.writes === true || list(step?.wouldWrite).length > 0;
}

function result({ decision, reason, errors = [], evidence = {} }) {
  return {
    ok: decision === "CONTROL_PLANE_DRY_RUN_READY",
    decision,
    reason,
    errors,
    evidence,
    dryRun: true,
    writes: [],
    issueCommentWrite: false,
    prMerge: false,
    secretsTouched: false,
    deployTouched: false,
    nativeAutoMergeEnabled: false,
    unattendedLoopEnabled: false,
  };
}

export function controlPlaneHardeningDryRun(input = {}) {
  const errors = [];
  const flow = input.flow || {};
  const forbidden = input.forbidden || {};

  if (scalar(input.mode).toLowerCase() !== "dry-run") {
    errors.push("mode must be dry-run");
  }

  for (const stepName of REQUIRED_FLOW_STEPS) {
    const step = flow[stepName];
    if (!step) {
      errors.push(`missing flow step: ${stepName}`);
      continue;
    }
    if (stepWrites(step)) {
      return result({
        decision: "HOLD",
        reason: "HOLD_CONTROL_PLANE_WRITE_ATTEMPT",
        errors: [`${stepName} attempts writes in dry-run`],
        evidence: input,
      });
    }
  }

  for (const action of FORBIDDEN_ACTIONS) {
    if (forbidden[action] === true) {
      return result({
        decision: "HOLD",
        reason: "HOLD_FORBIDDEN_CONTROL_PLANE_ACTION",
        errors: [`forbidden action enabled: ${action}`],
        evidence: input,
      });
    }
  }

  const outputs = list(flow.reporting?.outputs);
  for (const requiredOutput of ["HOLD", "FIX_REQUIRED"]) {
    if (!outputs.includes(requiredOutput)) {
      errors.push(`reporting.outputs must include ${requiredOutput}`);
    }
  }

  const mergeDecision = scalar(flow.mergeDecision?.decision);
  if (mergeDecision !== "MERGE_READY_DRY_RUN") {
    errors.push("mergeDecision.decision must be MERGE_READY_DRY_RUN");
  }

  if (flow.mergeDecision?.nativeAutoMergeEnabled === true) {
    return result({
      decision: "HOLD",
      reason: "HOLD_NATIVE_AUTO_MERGE_ENABLEMENT",
      errors: ["native auto-merge enablement is not allowed"],
      evidence: input,
    });
  }

  if (errors.length) {
    return result({
      decision: "FIX_REQUIRED",
      reason: "FIX_CONTROL_PLANE_DRY_RUN_INPUT",
      errors,
      evidence: input,
    });
  }

  return result({
    decision: "CONTROL_PLANE_DRY_RUN_READY",
    reason: "CONTROL_PLANE_FLOW_IS_DRY_RUN_ONLY",
    evidence: input,
  });
}

export function formatControlPlaneHardeningReport(report) {
  const lines = [
    "Control-plane hardening dry-run",
    `Decision: ${report.decision}`,
    `Reason: ${report.reason}`,
    "Writes: none",
    `Issue comment write: ${report.issueCommentWrite ? "yes" : "no"}`,
    `PR merge: ${report.prMerge ? "yes" : "no"}`,
    `Secrets touched: ${report.secretsTouched ? "yes" : "no"}`,
    `Deploy touched: ${report.deployTouched ? "yes" : "no"}`,
    `Native auto-merge enabled: ${report.nativeAutoMergeEnabled ? "yes" : "no"}`,
    `Unattended loop enabled: ${report.unattendedLoopEnabled ? "yes" : "no"}`,
    "Errors:",
  ];

  if (report.errors.length) {
    for (const error of report.errors) lines.push(`  - ${error}`);
  } else {
    lines.push("  (none)");
  }

  return `${lines.join("\n")}\n`;
}

function readJson(inputPath) {
  return JSON.parse(fs.readFileSync(inputPath, "utf8"));
}

function main() {
  const [inputPath] = process.argv.slice(2);
  const report = controlPlaneHardeningDryRun(inputPath ? readJson(inputPath) : {});
  process.stdout.write(formatControlPlaneHardeningReport(report));
  process.exitCode = report.decision === "FIX_REQUIRED" ? 1 : 0;
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentFile = fileURLToPath(import.meta.url);

if (entrypoint === currentFile) main();
