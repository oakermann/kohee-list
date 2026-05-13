#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bridgeIssueTaskDryRun } from "./issue-task-bridge.mjs";
import { listValue } from "./task-packet.mjs";

const SCRIPT_MODES = new Set(["dry-run", "parser-test", "test-only", "tooling-only"]);

function normalizePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function isDocsPath(file) {
  return file === "AGENTS.md" || file.startsWith("docs/") || file.endsWith(".md");
}

function isScriptsPath(file) {
  return file.startsWith("scripts/") || file.startsWith("automation/github-app-worker/test/");
}

function isForbiddenPath(file) {
  return (
    file === "schema.sql" ||
    file === "wrangler.toml" ||
    file === "worker.js" ||
    file === "package-lock.json" ||
    file.startsWith(".github/workflows/") ||
    file.startsWith("migrations/") ||
    file.startsWith("schema/") ||
    file.startsWith("d1/") ||
    /^server\/(auth|session|security|csv|cafes|favorites|routes|users)\.js$/.test(
      file,
    ) ||
    file.startsWith("assets/") ||
    file.startsWith(".pages-deploy/")
  );
}

function scopeErrors(packet) {
  const fields = packet.fields;
  const mode = String(fields.mode || "").toLowerCase();
  const allowedFiles = listValue(fields.allowed_files).map(normalizePath);
  const errors = [];
  const forbiddenFiles = allowedFiles.filter(isForbiddenPath);

  if (forbiddenFiles.length > 0) {
    errors.push(`forbidden allowed_files entries: ${forbiddenFiles.join(", ")}`);
  }

  if (mode === "docs-only" && !allowedFiles.every(isDocsPath)) {
    errors.push("docs-only mode requires allowed_files to stay in docs/ or markdown paths");
  }

  if (SCRIPT_MODES.has(mode) && !allowedFiles.every(isScriptsPath)) {
    errors.push("script dry-run/test mode requires allowed_files to stay in scripts/ or worker tests");
  }

  if (mode === "profile-only" && !allowedFiles.every((file) => file.startsWith("docs/"))) {
    errors.push("profile-only mode requires docs/profile files only");
  }

  return errors;
}

function result({ ok, decision, reason, errors = [], packet = null, bridge = null }) {
  return {
    ok,
    decision,
    reason,
    errors,
    packet,
    bridge,
    dryRun: true,
    writes: [],
    branchCreation: false,
    pullRequestCreation: false,
    unattendedLoop: false,
  };
}

export function localCodexWatcherDryRun({
  comments = [],
  evidence = {},
  issueNumber = 23,
  now,
} = {}) {
  const bridge = bridgeIssueTaskDryRun({
    comments,
    evidence,
    issueNumber,
    now,
  });

  if (bridge.decision !== "SELECT_TASK_DRY_RUN") {
    return result({
      ok: false,
      decision: bridge.decision,
      reason: bridge.reason,
      errors: bridge.errors,
      packet: bridge.packet,
      bridge,
    });
  }

  const packet = bridge.packet;
  const fields = packet.fields;
  const risk = String(fields.risk || "").toUpperCase();
  if (risk !== "LOW" && risk !== "MEDIUM") {
    return result({
      ok: false,
      decision: "HOLD",
      reason: "HOLD_UNEXECUTABLE_RISK",
      errors: [`risk ${fields.risk} is not executable by Local Codex watcher`],
      packet,
      bridge,
    });
  }

  const errors = scopeErrors(packet);
  if (errors.length > 0) {
    return result({
      ok: false,
      decision: "HOLD",
      reason: "HOLD_RESTRICTED_SCOPE",
      errors,
      packet,
      bridge,
    });
  }

  return result({
    ok: true,
    decision: "LOCAL_CODEX_EXECUTABLE_DRY_RUN",
    reason: "TASK_PACKET_EXECUTABLE",
    packet,
    bridge,
  });
}

export function formatLocalCodexWatcherReport(result) {
  const lines = [
    "Local Codex watcher dry-run",
    `Decision: ${result.decision}`,
    `Reason: ${result.reason}`,
    "Writes: none",
    `Branch creation: ${result.branchCreation ? "yes" : "no"}`,
    `PR creation: ${result.pullRequestCreation ? "yes" : "no"}`,
    `Unattended loop: ${result.unattendedLoop ? "yes" : "no"}`,
  ];

  if (result.packet?.fields?.task_id) {
    lines.push(`Task: ${result.packet.fields.task_id}`);
  }

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
  const [commentsPath, evidencePath] = process.argv.slice(2);
  const comments = commentsPath ? readJson(commentsPath) : [];
  const evidence = evidencePath ? readJson(evidencePath) : {};
  const report = localCodexWatcherDryRun({ comments, evidence });
  process.stdout.write(formatLocalCodexWatcherReport(report));
}
