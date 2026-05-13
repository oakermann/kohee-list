#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatTaskPacketReport,
  parseTaskPackets,
  validateTaskPacket,
} from "./task-packet.mjs";

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function arrayValue(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export function normalizeIssueComments(input) {
  const comments = Array.isArray(input) ? input : input?.comments || [];
  return comments.map((comment, index) => ({
    index,
    id: comment.id ?? `comment-${index + 1}`,
    body: String(comment.body || ""),
    created_at: comment.created_at || "",
    updated_at: comment.updated_at || comment.created_at || "",
    author: comment.user?.login || comment.author || "",
  }));
}

export function extractIssueTaskPackets(comments, options = {}) {
  return normalizeIssueComments(comments).flatMap((comment) =>
    parseTaskPackets(comment.body).map((packet) => {
      const validation = validateTaskPacket(packet, options);
      return {
        comment,
        packet,
        validation,
      };
    }),
  );
}

function evidenceBlockers(evidence = {}) {
  const blockers = [];
  const openPullRequests = numberValue(evidence.openPullRequests);
  const unresolvedReviewThreads = numberValue(evidence.unresolvedReviewThreads);
  const failedChecks = arrayValue(evidence.failedChecks);
  const issueBlockers = arrayValue(evidence.issueBlockers);

  if (openPullRequests > 0) {
    blockers.push(`open PR blocker count: ${openPullRequests}`);
  }
  if (failedChecks.length > 0) {
    blockers.push(`failed check blockers: ${failedChecks.join(", ")}`);
  }
  if (unresolvedReviewThreads > 0) {
    blockers.push(`unresolved review thread blockers: ${unresolvedReviewThreads}`);
  }
  if (issueBlockers.length > 0) {
    blockers.push(`issue blockers: ${issueBlockers.join(", ")}`);
  }

  return blockers;
}

function result({ ok, decision, reason, errors = [], packet = null, comment = null }) {
  return {
    ok,
    decision,
    reason,
    errors,
    packet,
    comment,
    dryRun: true,
    writes: [],
  };
}

export function bridgeIssueTaskDryRun({
  comments = [],
  evidence = {},
  issueNumber = 23,
  now,
} = {}) {
  const blockers = evidenceBlockers(evidence);
  if (blockers.length > 0) {
    return result({
      ok: false,
      decision: "HOLD",
      reason: "HOLD_GITHUB_EVIDENCE_BLOCKER",
      errors: blockers,
    });
  }

  const entries = extractIssueTaskPackets(comments, { now });
  if (entries.length === 0) {
    return result({
      ok: false,
      decision: "HOLD",
      reason: "HOLD_TASK_PACKET_MISSING",
      errors: [`issue #${issueNumber} has no TASK_PACKET`],
    });
  }

  const readyEntries = entries.filter(
    (entry) => entry.validation.decision === "READY",
  );
  if (readyEntries.length > 1) {
    return result({
      ok: false,
      decision: "HOLD",
      reason: "HOLD_MULTIPLE_ACTIVE_TASK_PACKETS",
      errors: [`found ${readyEntries.length} active task packets`],
    });
  }

  if (readyEntries.length === 1) {
    const selected = readyEntries[0];
    return result({
      ok: true,
      decision: "SELECT_TASK_DRY_RUN",
      reason: "ACTIVE_TASK_PACKET_SELECTED",
      packet: selected.packet,
      comment: selected.comment,
    });
  }

  const fixRequired = entries.find(
    (entry) => entry.validation.decision === "FIX_REQUIRED",
  );
  if (fixRequired) {
    return result({
      ok: false,
      decision: "FIX_REQUIRED",
      reason: fixRequired.validation.reason,
      errors: fixRequired.validation.errors,
      packet: fixRequired.packet,
      comment: fixRequired.comment,
    });
  }

  const held = entries.find((entry) => entry.validation.decision === "HOLD");
  if (held) {
    return result({
      ok: false,
      decision: "HOLD",
      reason: held.validation.reason,
      errors: held.validation.errors,
      packet: held.packet,
      comment: held.comment,
    });
  }

  return result({
    ok: false,
    decision: "HOLD",
    reason: "HOLD_TASK_PACKET_MISSING",
    errors: [`issue #${issueNumber} has no active TASK_PACKET`],
  });
}

export function formatIssueTaskBridgeReport(result) {
  const lines = [
    "Issue task bridge dry-run",
    `Decision: ${result.decision}`,
    `Reason: ${result.reason}`,
    "Writes: none",
  ];

  if (result.comment?.id) lines.push(`Comment: ${result.comment.id}`);
  if (result.packet?.fields?.task_id) {
    lines.push(`Task: ${result.packet.fields.task_id}`);
  }

  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const error of result.errors) lines.push(`  - ${error}`);
  }

  if (result.packet && result.decision !== "SELECT_TASK_DRY_RUN") {
    lines.push("");
    lines.push(formatTaskPacketReport({
      decision: result.decision,
      reason: result.reason,
      errors: result.errors,
      warnings: [],
      packet: result.packet,
    }).trim());
  }

  return `${lines.join("\n")}\n`;
}

function readJson(inputPath) {
  return JSON.parse(fs.readFileSync(inputPath, "utf8"));
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentFile = fileURLToPath(import.meta.url);

if (entrypoint === currentFile) {
  const [commentsPath, evidencePath] = process.argv.slice(2);
  const commentsInput = commentsPath ? readJson(commentsPath) : [];
  const evidence = evidencePath ? readJson(evidencePath) : {};
  const report = bridgeIssueTaskDryRun({
    comments: commentsInput,
    evidence,
  });
  process.stdout.write(formatIssueTaskBridgeReport(report));
}
