#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TASK_PACKET_REQUIRED_FIELDS = [
  "task_id",
  "project",
  "lane",
  "risk",
  "mode",
  "goal",
  "allowed_files",
  "forbidden_areas",
  "checks",
  "stop_condition",
  "report_format",
  "merge_policy",
];

export const TASK_PACKET_OPTIONAL_FIELDS = [
  "version",
  "status",
  "created_at",
  "expires_at",
  "depends_on",
];

export const TASK_PACKET_LANES = new Set([
  "AUTOMATION_PLATFORM",
  "KOHEE_PRODUCT",
]);

export const TASK_PACKET_RISKS = new Set(["LOW", "MEDIUM", "HIGH", "HOLD"]);

const TASK_PACKET_MODES = new Set([
  "audit-only",
  "docs-only",
  "dry-run",
  "parser-test",
  "profile-only",
  "test-only",
  "tooling-only",
]);

const TASK_PACKET_MERGE_POLICIES = new Set([
  "manual",
  "no-auto-merge",
  "strict-evidence-gate",
  "low-medium-evidence-gate",
]);

const TERMINAL_STATUSES = new Set([
  "cancelled",
  "closed",
  "done",
  "merged",
  "stale",
  "superseded",
]);

const FIELD_KEYS = new Set([
  ...TASK_PACKET_REQUIRED_FIELDS,
  ...TASK_PACKET_OPTIONAL_FIELDS,
]);

function scalar(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function normalizeRisk(value) {
  return scalar(value).toUpperCase();
}

function normalizeLane(value) {
  return scalar(value).toUpperCase();
}

function normalizeMode(value) {
  return scalar(value).toLowerCase();
}

function normalizeMergePolicy(value) {
  return scalar(value).toLowerCase();
}

function parseDate(value) {
  const text = scalar(value);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function listValue(value) {
  const text = scalar(value).replace(/^\[|\]$/g, "");
  if (!text || /^(none|n\/a)$/i.test(text)) return [];
  return text
    .split(/[,;]/)
    .map((item) => scalar(item))
    .filter(Boolean);
}

function packetMarker(line) {
  return /^\s*TASK_PACKET(?:\s+v?1)?\s*:\s*$/i.test(line);
}

function fieldLine(line) {
  const match = line.match(/^\s{0,4}([a-z_][a-z0-9_]*)\s*:\s*(.*)$/);
  if (!match) return null;
  const key = match[1];
  if (!FIELD_KEYS.has(key)) return null;
  return { key, value: scalar(match[2]) };
}

export function parseTaskPackets(text) {
  const lines = String(text || "").split(/\r?\n/);
  const packets = [];
  let current = null;

  function finishPacket(endLine) {
    if (!current) return;
    packets.push({
      index: packets.length,
      marker: "TASK_PACKET",
      startLine: current.startLine,
      endLine,
      fields: current.fields,
      raw: current.rawLines.join("\n"),
    });
    current = null;
  }

  lines.forEach((line, index) => {
    if (packetMarker(line.trim())) {
      finishPacket(index);
      current = {
        startLine: index + 1,
        fields: {},
        rawLines: [line],
      };
      return;
    }

    if (!current) return;

    const parsed = fieldLine(line);
    if (parsed) {
      current.fields[parsed.key] = parsed.value;
      current.rawLines.push(line);
      return;
    }

    if (!line.trim()) {
      current.rawLines.push(line);
      return;
    }

    if (Object.keys(current.fields).length > 0 && /^\S/.test(line)) {
      finishPacket(index);
      return;
    }

    current.rawLines.push(line);
  });

  finishPacket(lines.length);
  return packets;
}

function invalid(reason, errors, packet) {
  return {
    ok: false,
    decision: "FIX_REQUIRED",
    reason,
    errors,
    warnings: [],
    packet,
  };
}

function hold(reason, errors, packet) {
  return {
    ok: false,
    decision: "HOLD",
    reason,
    errors,
    warnings: [],
    packet,
  };
}

function ready(packet, warnings = []) {
  return {
    ok: true,
    decision: "READY",
    reason: "TASK_PACKET_READY",
    errors: [],
    warnings,
    packet,
  };
}

export function validateTaskPacket(packet, options = {}) {
  if (!packet?.fields) {
    return hold("HOLD_TASK_PACKET_MISSING", ["TASK_PACKET is missing"], null);
  }

  const fields = packet.fields;
  const missing = TASK_PACKET_REQUIRED_FIELDS.filter(
    (field) => !scalar(fields[field]),
  );
  if (missing.length) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      [`missing required fields: ${missing.join(", ")}`],
      packet,
    );
  }

  const risk = normalizeRisk(fields.risk);
  if (!TASK_PACKET_RISKS.has(risk)) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      [`unsupported risk: ${fields.risk}`],
      packet,
    );
  }

  const lane = normalizeLane(fields.lane);
  if (!TASK_PACKET_LANES.has(lane)) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      [`unsupported lane: ${fields.lane}`],
      packet,
    );
  }

  const mode = normalizeMode(fields.mode);
  if (!TASK_PACKET_MODES.has(mode)) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      [`unsupported mode: ${fields.mode}`],
      packet,
    );
  }

  const mergePolicy = normalizeMergePolicy(fields.merge_policy);
  if (!TASK_PACKET_MERGE_POLICIES.has(mergePolicy)) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      [`unsupported merge_policy: ${fields.merge_policy}`],
      packet,
    );
  }

  if (listValue(fields.allowed_files).length === 0) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      ["allowed_files must name at least one path or glob"],
      packet,
    );
  }

  if (listValue(fields.checks).length === 0) {
    return invalid(
      "FIX_TASK_PACKET_INVALID",
      ["checks must name at least one validation command"],
      packet,
    );
  }

  for (const label of ["Status", "Blocker", "Next action", "Evidence"]) {
    if (!fields.report_format.includes(label)) {
      return invalid(
        "FIX_TASK_PACKET_INVALID",
        [`report_format must include ${label}`],
        packet,
      );
    }
  }

  const status = scalar(fields.status).toLowerCase();
  if (TERMINAL_STATUSES.has(status)) {
    return hold(
      "HOLD_TASK_PACKET_STALE",
      [`terminal task packet status: ${fields.status}`],
      packet,
    );
  }

  const expiresAt = parseDate(fields.expires_at);
  const now = options.now instanceof Date ? options.now : new Date();
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return hold(
      "HOLD_TASK_PACKET_STALE",
      [`task packet expired at ${fields.expires_at}`],
      packet,
    );
  }

  if (risk === "HIGH" || risk === "HOLD") {
    return hold(
      "HOLD_HIGH_RISK",
      [`risk ${risk} requires explicit approval`],
      packet,
    );
  }

  return ready(packet);
}

export function validateTaskPacketText(text, options = {}) {
  const packets = parseTaskPackets(text);
  if (packets.length === 0) {
    return hold("HOLD_TASK_PACKET_MISSING", ["TASK_PACKET is missing"], null);
  }

  if (packets.length > 1 && options.requireExactlyOne !== false) {
    return hold(
      "HOLD_MULTIPLE_TASK_PACKETS",
      [`found ${packets.length} task packets`],
      null,
    );
  }

  return validateTaskPacket(packets[0], options);
}

export function formatTaskPacketReport(result) {
  const lines = [
    "Task packet report",
    `Decision: ${result.decision}`,
    `Reason: ${result.reason}`,
  ];

  if (result.packet?.fields?.task_id) {
    lines.push(`Task: ${result.packet.fields.task_id}`);
  }

  if (result.errors.length) {
    lines.push("Errors:");
    for (const error of result.errors) lines.push(`  - ${error}`);
  }

  if (result.warnings.length) {
    lines.push("Warnings:");
    for (const warning of result.warnings) lines.push(`  - ${warning}`);
  }

  return `${lines.join("\n")}\n`;
}

function readInput(paths) {
  if (paths.length === 0) return "";
  return paths.map((inputPath) => fs.readFileSync(inputPath, "utf8")).join("\n");
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentFile = fileURLToPath(import.meta.url);

if (entrypoint === currentFile) {
  const result = validateTaskPacketText(readInput(process.argv.slice(2)));
  process.stdout.write(formatTaskPacketReport(result));
}
