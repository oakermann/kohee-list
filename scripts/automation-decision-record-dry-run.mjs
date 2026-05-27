#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { mergeReadinessDryRun } from "./merge-readiness-dry-run.mjs";
import { validateTaskPacketText } from "./task-packet.mjs";

function scalar(value) {
  return String(value ?? "").trim();
}

function normalizeRisk(value) {
  return scalar(value).toUpperCase();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function policyOverall(policyRisk) {
  return scalar(policyRisk?.overall || policyRisk?.policyRiskOverall);
}

function projectStatus(profile) {
  return scalar(profile?.status).toLowerCase();
}

function profileProject(profile) {
  return scalar(profile?.project);
}

function packetProject(packetResult) {
  return scalar(packetResult?.packet?.fields?.project);
}

function result({
  decision,
  reason,
  errors = [],
  taskPacket,
  projectProfile,
  policyRisk,
  prEvidence,
  mergeReadiness,
}) {
  return {
    ok: decision === "MERGE_READY_DRY_RUN" || decision === "NEXT",
    decision,
    reason,
    errors,
    taskPacket,
    projectProfile,
    policyRisk,
    prEvidence,
    mergeReadiness,
    dryRun: true,
    writes: [],
    nativeAutoMergeEnabled: false,
  };
}

export function buildAutomationDecisionRecord(input = {}) {
  const taskPacketText = scalar(input.taskPacketText);
  const projectProfile = input.projectProfile || {};
  const policyRisk = input.policyRisk || {};
  const prEvidence = input.prEvidence || {};

  if (prEvidence.merged === true || scalar(prEvidence.state).toLowerCase() === "merged") {
    return result({
      decision: "NEXT",
      reason: "PR_ALREADY_MERGED",
      projectProfile,
      policyRisk,
      prEvidence,
      taskPacket: null,
      mergeReadiness: null,
    });
  }

  const taskPacket = validateTaskPacketText(taskPacketText, {
    now: input.now ? new Date(input.now) : undefined,
  });

  if (!taskPacket.ok) {
    return result({
      decision: taskPacket.decision,
      reason: taskPacket.reason,
      errors: taskPacket.errors,
      taskPacket,
      projectProfile,
      policyRisk,
      prEvidence,
      mergeReadiness: null,
    });
  }

  const errors = [];
  const packetProjectName = packetProject(taskPacket);
  const profileProjectName = profileProject(projectProfile);
  if (!profileProjectName) {
    errors.push("project profile missing project");
  } else if (packetProjectName !== profileProjectName) {
    errors.push(
      `task packet project does not match project profile: ${packetProjectName} != ${profileProjectName}`,
    );
  }

  if (projectStatus(projectProfile).includes("placeholder")) {
    return result({
      decision: "HOLD",
      reason: "HOLD_PLACEHOLDER_PROJECT_PROFILE",
      errors: ["placeholder project profile is not routable"],
      taskPacket,
      projectProfile,
      policyRisk,
      prEvidence,
      mergeReadiness: null,
    });
  }

  if (/HIGH\/HOLD|HIGH|HOLD/i.test(policyOverall(policyRisk))) {
    return result({
      decision: "HOLD",
      reason: "HOLD_POLICY_RISK",
      errors: [`policy risk result: ${policyOverall(policyRisk)}`],
      taskPacket,
      projectProfile,
      policyRisk,
      prEvidence,
      mergeReadiness: null,
    });
  }

  if (errors.length) {
    return result({
      decision: "FIX_REQUIRED",
      reason: "FIX_DECISION_INPUT_MISMATCH",
      errors,
      taskPacket,
      projectProfile,
      policyRisk,
      prEvidence,
      mergeReadiness: null,
    });
  }

  const mergeReadiness = mergeReadinessDryRun(prEvidence);
  return result({
    decision: mergeReadiness.decision,
    reason: mergeReadiness.reason,
    errors: mergeReadiness.errors,
    taskPacket,
    projectProfile,
    policyRisk,
    prEvidence,
    mergeReadiness,
  });
}

export function formatAutomationDecisionRecord(record) {
  const lines = [
    "Automation decision record dry-run",
    `Decision: ${record.decision}`,
    `Reason: ${record.reason}`,
    "Writes: none",
    `Native auto-merge enabled: ${record.nativeAutoMergeEnabled ? "yes" : "no"}`,
  ];

  const project = profileProject(record.projectProfile);
  if (project) lines.push(`Project: ${project}`);
  if (record.prEvidence?.number) lines.push(`PR: ${record.prEvidence.number}`);
  if (record.prEvidence?.headSha) {
    lines.push(`Head SHA: ${record.prEvidence.headSha}`);
  }

  lines.push("Errors:");
  if (record.errors.length) {
    for (const error of record.errors) lines.push(`  - ${error}`);
  } else {
    lines.push("  (none)");
  }

  return `${lines.join("\n")}\n`;
}

function readInput(args) {
  if (args.length === 1) {
    return readJson(args[0]);
  }

  if (args.length === 4) {
    const [taskPacketPath, projectProfilePath, policyRiskPath, prEvidencePath] =
      args;
    return {
      taskPacketText: readText(taskPacketPath),
      projectProfile: readJson(projectProfilePath),
      policyRisk: readJson(policyRiskPath),
      prEvidence: readJson(prEvidencePath),
    };
  }

  return {};
}

function main() {
  const record = buildAutomationDecisionRecord(readInput(process.argv.slice(2)));
  process.stdout.write(formatAutomationDecisionRecord(record));
  process.exitCode = record.decision === "FIX_REQUIRED" ? 1 : 0;
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentFile = fileURLToPath(import.meta.url);

if (entrypoint === currentFile) main();
