#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_PROFILE_REQUIRED_PATHS = [
  "version",
  "project",
  "status",
  "repository.full_name",
  "repository.default_branch",
  "repository.local_path_policy",
  "routing.active_lane",
  "routing.active_queue",
  "routing.task_queue",
  "automation_scope.auto_merge_allowed",
  "automation_scope.auto_merge_forbidden",
  "forbidden_areas",
  "required_checks",
  "merge_evidence_gates",
  "deploy_policy.allowed_by_default",
  "deploy_policy.rule",
  "product_invariants",
];

const VALID_LANES = new Set(["AUTOMATION_PLATFORM", "KOHEE_PRODUCT"]);

function scalar(value) {
  return String(value ?? "").trim();
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return current[key];
  }, value);
}

function isPresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return scalar(value).length > 0;
}

function readProfileFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function profileFilesFromDefaultDir() {
  const dir = "docs/project-profiles";
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(dir, name));
}

function placeholderRows(profile) {
  return (Array.isArray(profile.placeholder_projects)
    ? profile.placeholder_projects
    : []
  ).map((entry) => {
    const project = scalar(entry?.project) || "(unnamed placeholder)";
    const status = scalar(entry?.status);
    return {
      project,
      status,
      decision: status === "placeholder_only" ? "HOLD_NOT_ROUTABLE" : "FIX_REQUIRED",
      reason:
        status === "placeholder_only"
          ? "placeholder project has no routable profile yet"
          : "placeholder project must use status placeholder_only",
    };
  });
}

export function validateProjectProfile(profile, sourcePath = "(inline)") {
  const errors = [];
  const warnings = [];

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return {
      sourcePath,
      project: "(invalid)",
      ok: false,
      decision: "FIX_REQUIRED",
      reason: "FIX_PROFILE_INVALID",
      errors: ["profile must be a JSON object"],
      warnings,
      placeholders: [],
    };
  }

  for (const requiredPath of PROJECT_PROFILE_REQUIRED_PATHS) {
    const value = getPath(profile, requiredPath);
    if (!isPresent(value)) errors.push(`missing required field: ${requiredPath}`);
  }

  const activeLane = scalar(getPath(profile, "routing.active_lane"));
  if (activeLane && !VALID_LANES.has(activeLane)) {
    errors.push(`unsupported routing.active_lane: ${activeLane}`);
  }

  const autoMergeAllowed = getPath(profile, "automation_scope.auto_merge_allowed");
  const autoMergeForbidden = getPath(
    profile,
    "automation_scope.auto_merge_forbidden",
  );
  if (autoMergeAllowed && !Array.isArray(autoMergeAllowed)) {
    errors.push("automation_scope.auto_merge_allowed must be an array");
  }
  if (autoMergeForbidden && !Array.isArray(autoMergeForbidden)) {
    errors.push("automation_scope.auto_merge_forbidden must be an array");
  }

  const deployDefault = getPath(profile, "deploy_policy.allowed_by_default");
  if (deployDefault !== undefined && typeof deployDefault !== "boolean") {
    errors.push("deploy_policy.allowed_by_default must be boolean");
  }

  const placeholders = placeholderRows(profile);
  for (const placeholder of placeholders) {
    if (placeholder.decision === "FIX_REQUIRED") {
      errors.push(`${placeholder.project}: ${placeholder.reason}`);
    }
  }

  if (!placeholders.length) {
    warnings.push("no placeholder projects declared");
  }

  const ok = errors.length === 0;
  return {
    sourcePath,
    project: scalar(profile.project) || "(unnamed project)",
    ok,
    decision: ok ? "READY" : "FIX_REQUIRED",
    reason: ok ? "PROJECT_PROFILE_READY" : "FIX_PROFILE_INVALID",
    errors,
    warnings,
    placeholders,
  };
}

export function validateProjectProfiles(inputs) {
  const files = inputs?.length ? inputs : profileFilesFromDefaultDir();
  if (!files.length) {
    return {
      decision: "HOLD",
      reason: "HOLD_NO_PROJECT_PROFILES",
      ok: false,
      profiles: [],
      placeholders: [],
      errors: ["no project profile JSON files found"],
      warnings: [],
    };
  }

  const profiles = files.map((file) => {
    try {
      return validateProjectProfile(readProfileFile(file), file);
    } catch (error) {
      return {
        sourcePath: file,
        project: "(unreadable)",
        ok: false,
        decision: "FIX_REQUIRED",
        reason: "FIX_PROFILE_INVALID",
        errors: [`failed to read profile JSON: ${error.message}`],
        warnings: [],
        placeholders: [],
      };
    }
  });

  const errors = profiles.flatMap((profile) =>
    profile.errors.map((error) => `${profile.sourcePath}: ${error}`),
  );
  const warnings = profiles.flatMap((profile) =>
    profile.warnings.map((warning) => `${profile.sourcePath}: ${warning}`),
  );
  const placeholders = profiles.flatMap((profile) =>
    profile.placeholders.map((placeholder) => ({
      sourcePath: profile.sourcePath,
      ...placeholder,
    })),
  );

  return {
    decision: errors.length ? "FIX_REQUIRED" : "READY",
    reason: errors.length
      ? "FIX_PROJECT_PROFILE_INVALID"
      : "PROJECT_PROFILES_READY",
    ok: errors.length === 0,
    profiles,
    placeholders,
    errors,
    warnings,
  };
}

export function formatProjectProfileReport(report) {
  const lines = [
    "Project profile report",
    `Decision: ${report.decision}`,
    `Reason: ${report.reason}`,
    `Blocking: ${report.ok ? "no" : "yes"}`,
    "",
    "Managed profiles:",
  ];

  if (report.profiles.length) {
    for (const profile of report.profiles) {
      lines.push(
        `  - ${profile.project} (${profile.sourcePath}): ${profile.decision}`,
      );
    }
  } else {
    lines.push("  (none)");
  }

  lines.push("", "Placeholder projects:");
  if (report.placeholders.length) {
    for (const placeholder of report.placeholders) {
      lines.push(
        `  - ${placeholder.project} (${placeholder.sourcePath}): ${placeholder.decision}`,
      );
    }
  } else {
    lines.push("  (none)");
  }

  lines.push("", "Errors:");
  if (report.errors.length) {
    for (const error of report.errors) lines.push(`  - ${error}`);
  } else {
    lines.push("  (none)");
  }

  lines.push("", "Warnings:");
  if (report.warnings.length) {
    for (const warning of report.warnings) lines.push(`  - ${warning}`);
  } else {
    lines.push("  (none)");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const inputs = process.argv.slice(2);
  const report = validateProjectProfiles(inputs);
  process.stdout.write(formatProjectProfileReport(report));
  process.exitCode = report.ok ? 0 : 1;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) main();
