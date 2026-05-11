import assert from "node:assert/strict";
import fs from "node:fs";
import https from "node:https";

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

const SHARED_TEST_FILES = new Set(["scripts/test-unit.mjs"]);
const DISPATCH_MARKER = "<!-- kohee-command-dispatch:v1 -->";

const PRESETS = {
  "smoke-ack": {
    risk: "LOW",
    lane: "GOVERNANCE",
    allowed_files: "read-only",
    denied_files: "*",
    runtime_change_allowed: false,
    user_approval_required: false,
  },
  "governance-readonly": {
    risk: "LOW",
    lane: "GOVERNANCE",
    allowed_files:
      "AGENTS.md\nkohee.contract.json\ndocs/CODEX_WORKFLOW.md\ndocs/audits/KOHEE_FINDINGS.md\n.github/pull_request_template.md\n.github/ISSUE_TEMPLATE/**\nscripts/audit-kohee.mjs\npackage.json",
    denied_files: "server/**\nassets/**\n.pages-deploy/**\nmigrations/**\nschema.sql",
    runtime_change_allowed: false,
    user_approval_required: false,
  },
  "frontend-admin": {
    risk: "MEDIUM",
    lane: "FRONTEND_RENDERING",
    allowed_files:
      "admin.html\n.pages-deploy/admin.html\nassets/admin.js\n.pages-deploy/assets/admin.js\nassets/admin.css\n.pages-deploy/assets/admin.css\nassets/common.js\n.pages-deploy/assets/common.js",
    denied_files: "server/**\nmigrations/**\nschema.sql\nworker.js",
    runtime_change_allowed: false,
    user_approval_required: false,
  },
  "csv-export": {
    risk: "MEDIUM",
    lane: "CSV_PIPELINE",
    allowed_files:
      "server/csv.js\nserver/routes.js\nassets/admin.js\n.pages-deploy/assets/admin.js\nadmin.html\n.pages-deploy/admin.html\nscripts/test-unit.mjs",
    denied_files:
      "migrations/**\nschema.sql\nworker.js\nCSV import/reset behavior\npublic /data behavior\nauth/session/security behavior",
    runtime_change_allowed: false,
    user_approval_required: true,
  },
  "audit-only": {
    risk: "LOW",
    lane: "GOVERNANCE",
    allowed_files: "docs/audits/KOHEE_FINDINGS.md\nscripts/audit-kohee.mjs\npackage.json",
    denied_files: "server/**\nassets/**\n.pages-deploy/**\nmigrations/**\nschema.sql",
    runtime_change_allowed: false,
    user_approval_required: false,
  },
};

function lines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanPreset(value) {
  const normalized = String(value || "").trim();
  return normalized === "custom" ? "" : normalized;
}

function cleanChoice(value) {
  const normalized = String(value || "").trim();
  return normalized === "auto" ? "" : normalized;
}

function boolValue(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "preset" || normalized === "auto") return fallback;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

function readContract(path = "kohee.contract.json") {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function effectiveCommand(env, contract = readContract()) {
  const selectedPreset = cleanPreset(env.INPUT_PRESET);
  const preset = PRESETS[selectedPreset] || {};
  const risk = cleanChoice(env.INPUT_RISK) || preset.risk || "LOW";
  const lane = cleanChoice(env.INPUT_LANE) || preset.lane || "GOVERNANCE";
  const allowedFiles = lines(env.INPUT_ALLOWED_FILES).length
    ? lines(env.INPUT_ALLOWED_FILES)
    : lines(preset.allowed_files || "");
  const deniedFiles = lines(env.INPUT_DENIED_FILES).length
    ? lines(env.INPUT_DENIED_FILES)
    : lines(preset.denied_files || "");
  const runtimeChangeAllowed = boolValue(
    env.INPUT_RUNTIME_CHANGE_ALLOWED,
    preset.runtime_change_allowed ?? false,
  );
  const userApprovalRequired = boolValue(
    env.INPUT_USER_APPROVAL_REQUIRED,
    preset.user_approval_required ?? false,
  );
  const mergeOrder = String(env.INPUT_MERGE_ORDER || "").trim();
  const task = String(env.INPUT_TASK || "").trim();

  if (!contract.lanes?.[lane]) {
    throw new Error(`INVALID_LANE: ${lane}`);
  }

  return {
    task,
    selectedPreset,
    risk,
    lane,
    allowedFiles,
    deniedFiles,
    runtimeChangeAllowed,
    userApprovalRequired,
    mergeOrder,
  };
}

function normalizePattern(value) {
  return String(value || "").trim().replace(/^\.\//, "");
}

function isReadOnlyOrEmpty(value) {
  const normalized = normalizePattern(value);
  return !normalized || normalized === "(none)" || normalized === "read-only" || normalized === "*";
}

function stripGlobSuffix(value) {
  return normalizePattern(value).replace(/\/\*\*$/, "/").replace(/\*$/, "");
}

function patternsOverlap(a, b) {
  const left = normalizePattern(a);
  const right = normalizePattern(b);
  if (isReadOnlyOrEmpty(left) || isReadOnlyOrEmpty(right)) return false;
  if (left === right) return true;
  const leftPrefix = stripGlobSuffix(left);
  const rightPrefix = stripGlobSuffix(right);
  if (left.endsWith("/**") && right.startsWith(leftPrefix)) return true;
  if (right.endsWith("/**") && left.startsWith(rightPrefix)) return true;
  return false;
}

function hasSharedTestOverlap(newFiles, activeFiles) {
  return [...SHARED_TEST_FILES].some((testFile) =>
    newFiles.some((file) => patternsOverlap(file, testFile)) &&
    activeFiles.some((file) => patternsOverlap(file, testFile)),
  );
}

function extractYamlList(body, key) {
  const match = String(body || "").match(new RegExp(`${key}:\\n((?:    - .+\\n?)+)`, "m"));
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function extractField(body, key) {
  const match = String(body || "").match(new RegExp(`^  ${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

function extractTerminalStateFromText(text) {
  const value = String(text || "");
  if (!value.includes("KOHEE_STATUS")) return "";
  for (const state of TERMINAL_STATES) {
    if (value.includes(state)) return state;
  }
  return "";
}

function parseCommandIssue(issue) {
  if (issue.pull_request) return null;
  const body = issue.body || "";
  if (!body.includes(DISPATCH_MARKER)) return null;
  const bodyState = extractField(body, "state") || "QUEUED";
  const commentState = extractTerminalStateFromText(issue.koheeStatusComments || "");
  const state = commentState || bodyState;
  return {
    number: issue.number,
    title: issue.title || "",
    state,
    risk: extractField(body, "risk") || "LOW",
    lane: extractField(body, "lane") || "GOVERNANCE",
    allowedFiles: extractYamlList(body, "allowed_files"),
    deniedFiles: extractYamlList(body, "denied_files"),
    isTerminal: TERMINAL_STATES.has(state),
  };
}

function validateAgainstActive(command, activeCommands) {
  const errors = [];
  const active = activeCommands.filter((item) => !item.isTerminal);

  if (active.length > 0 && !command.mergeOrder) {
    errors.push("MERGE_ORDER_REQUIRED_FOR_PARALLEL_COMMAND");
  }

  if (["HIGH", "HOLD"].includes(command.risk) && active.length > 0) {
    errors.push("HIGH_OR_HOLD_COMMAND_MUST_NOT_RUN_IN_PARALLEL");
  }

  if (command.risk === "HIGH" && !command.userApprovalRequired) {
    errors.push("HIGH_RISK_COMMAND_REQUIRES_USER_APPROVAL");
  }

  for (const existing of active) {
    if (existing.risk === "HIGH" || existing.risk === "HOLD") {
      errors.push(`ACTIVE_HIGH_OR_HOLD_COMMAND_BLOCKS_PARALLEL:#${existing.number}`);
    }

    const overlaps = [];
    for (const nextFile of command.allowedFiles) {
      for (const existingFile of existing.allowedFiles) {
        if (patternsOverlap(nextFile, existingFile)) {
          overlaps.push(`${nextFile} <> #${existing.number}:${existingFile}`);
        }
      }
    }
    if (overlaps.length > 0) {
      errors.push(`SAME_FILE_OVERLAP:${overlaps.join(",")}`);
    }

    if (hasSharedTestOverlap(command.allowedFiles, existing.allowedFiles)) {
      errors.push(`SHARED_TEST_FILE_OVERLAP:#${existing.number}:scripts/test-unit.mjs`);
    }
  }

  return errors;
}

function githubRequest({ token, owner, repo, path }) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.github.com",
        path,
        method: "GET",
        headers: {
          "user-agent": "kohee-command-validator",
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
        },
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GITHUB_API_${response.statusCode}: ${data.slice(0, 500)}`));
            return;
          }
          resolve(JSON.parse(data));
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

async function listOpenCommandIssues(env) {
  const token = env.GITHUB_TOKEN;
  const repository = env.GITHUB_REPOSITORY || "";
  if (!token || !repository.includes("/")) return [];
  const [owner, repo] = repository.split("/");
  const issues = await githubRequest({
    token,
    owner,
    repo,
    path: `/repos/${owner}/${repo}/issues?state=open&labels=codex&per_page=100`,
  });
  const commandIssues = issues.filter((issue) => !issue.pull_request && (issue.body || "").includes(DISPATCH_MARKER));
  const enriched = await Promise.all(
    commandIssues.map(async (issue) => {
      const comments = await githubRequest({
        token,
        owner,
        repo,
        path: `/repos/${owner}/${repo}/issues/${issue.number}/comments?per_page=100`,
      });
      return {
        ...issue,
        koheeStatusComments: comments.map((comment) => comment.body || "").join("\n"),
      };
    }),
  );
  return enriched.map(parseCommandIssue).filter(Boolean);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const contract = readContract();
  const command = effectiveCommand(process.env, contract);
  const activeCommands = await listOpenCommandIssues(process.env);
  const errors = validateAgainstActive(command, activeCommands);

  if (errors.length > 0) {
    console.error("KOHEE_COMMAND_VALIDATION_FAILED");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("KOHEE_COMMAND_VALIDATION_OK");
  console.log(`risk=${command.risk}`);
  console.log(`lane=${command.lane}`);
  console.log(`active_commands=${activeCommands.filter((item) => !item.isTerminal).length}`);
}

function runSelfTest() {
  const contract = {
    lanes: {
      GOVERNANCE: {},
      CSV_PIPELINE: {},
    },
  };
  const command = effectiveCommand(
    {
      INPUT_TASK: "test",
      INPUT_PRESET: "custom",
      INPUT_RISK: "MEDIUM",
      INPUT_LANE: "GOVERNANCE",
      INPUT_ALLOWED_FILES: "scripts/test-unit.mjs\npackage.json",
      INPUT_DENIED_FILES: "",
      INPUT_RUNTIME_CHANGE_ALLOWED: "false",
      INPUT_USER_APPROVAL_REQUIRED: "false",
      INPUT_MERGE_ORDER: "2-after-1",
    },
    contract,
  );
  assert.equal(command.risk, "MEDIUM");
  assert.equal(patternsOverlap("scripts/**", "scripts/test-unit.mjs"), true);
  assert.equal(patternsOverlap("docs/**", "server/cafes.js"), false);
  const errors = validateAgainstActive(command, [
    {
      number: 101,
      state: "QUEUED",
      risk: "LOW",
      lane: "CSV_PIPELINE",
      allowedFiles: ["scripts/test-unit.mjs"],
      isTerminal: false,
    },
  ]);
  assert.ok(errors.some((error) => error.startsWith("SAME_FILE_OVERLAP")));
  assert.ok(errors.some((error) => error.startsWith("SHARED_TEST_FILE_OVERLAP")));

  const mergeOrderErrors = validateAgainstActive(
    { ...command, mergeOrder: "", allowedFiles: ["docs/example.md"] },
    [
      {
        number: 102,
        state: "QUEUED",
        risk: "LOW",
        lane: "CSV_PIPELINE",
        allowedFiles: ["server/csv.js"],
        isTerminal: false,
      },
    ],
  );
  assert.ok(mergeOrderErrors.includes("MERGE_ORDER_REQUIRED_FOR_PARALLEL_COMMAND"));

  const terminalIssue = parseCommandIssue({
    number: 103,
    title: "terminal",
    body: `${DISPATCH_MARKER}\n\n\`\`\`yaml\nKOHEE_COMMAND:\n  state: QUEUED\n  risk: LOW\n  lane: GOVERNANCE\n  allowed_files:\n    - docs/example.md\n\`\`\``,
    koheeStatusComments: "KOHEE_STATUS: DONE_NO_DEPLOY",
  });
  assert.equal(terminalIssue.isTerminal, true);
  assert.equal(terminalIssue.state, "DONE_NO_DEPLOY");

  const highErrors = validateAgainstActive(
    { ...command, risk: "HIGH", userApprovalRequired: false },
    [],
  );
  assert.ok(highErrors.includes("HIGH_RISK_COMMAND_REQUIRES_USER_APPROVAL"));
  console.log("[validate-kohee-command] self-test ok");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
