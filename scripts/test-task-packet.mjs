import assert from "node:assert/strict";
import fs from "node:fs";

import {
  formatTaskPacketReport,
  listValue,
  parseTaskPackets,
  validateTaskPacket,
  validateTaskPacketText,
} from "./task-packet.mjs";

function readFixture(name) {
  return fs.readFileSync(`scripts/fixtures/${name}`, "utf8");
}

const validText = readFixture("task-packet-valid.txt");
const validPackets = parseTaskPackets(validText);
assert.equal(validPackets.length, 1);
assert.equal(validPackets[0].fields.task_id, "overnight-task-packet-v1");
assert.equal(validPackets[0].fields.lane, "AUTOMATION_PLATFORM");
assert.deepEqual(listValue(validPackets[0].fields.allowed_files).slice(0, 2), [
  "scripts/task-packet.mjs",
  "scripts/test-task-packet.mjs",
]);

const ready = validateTaskPacket(validPackets[0], {
  now: new Date("2026-05-13T00:00:00Z"),
});
assert.equal(ready.ok, true);
assert.equal(ready.decision, "READY");
assert.equal(ready.reason, "TASK_PACKET_READY");

const missing = validateTaskPacketText("");
assert.equal(missing.ok, false);
assert.equal(missing.decision, "HOLD");
assert.equal(missing.reason, "HOLD_TASK_PACKET_MISSING");

const invalid = validateTaskPacketText(
  readFixture("task-packet-invalid-missing-risk.txt"),
);
assert.equal(invalid.ok, false);
assert.equal(invalid.decision, "FIX_REQUIRED");
assert.equal(invalid.reason, "FIX_TASK_PACKET_INVALID");
assert.match(invalid.errors.join("\n"), /missing required fields: risk/);

const stale = validateTaskPacketText(readFixture("task-packet-stale.txt"));
assert.equal(stale.ok, false);
assert.equal(stale.decision, "HOLD");
assert.equal(stale.reason, "HOLD_TASK_PACKET_STALE");

const expired = validateTaskPacketText(validText.replace("2999", "2020"), {
  now: new Date("2026-05-13T00:00:00Z"),
});
assert.equal(expired.decision, "HOLD");
assert.equal(expired.reason, "HOLD_TASK_PACKET_STALE");

const highRisk = validateTaskPacketText(validText.replace("risk: MEDIUM", "risk: HIGH"));
assert.equal(highRisk.decision, "HOLD");
assert.equal(highRisk.reason, "HOLD_HIGH_RISK");

const invalidLane = validateTaskPacketText(
  validText.replace("lane: AUTOMATION_PLATFORM", "lane: NOT_A_LANE"),
);
assert.equal(invalidLane.decision, "FIX_REQUIRED");
assert.match(invalidLane.errors.join("\n"), /unsupported lane/);

const report = formatTaskPacketReport(invalid);
assert.match(report, /Task packet report/);
assert.match(report, /Decision: FIX_REQUIRED/);
assert.match(report, /Reason: FIX_TASK_PACKET_INVALID/);

console.log("[task-packet] ok");
