#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

import { decideWebhookAction } from "./src/policy.mjs";

async function main() {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error("Usage: node automation/github-app-worker/simulate-fixture.mjs <fixture.json>");
    process.exit(2);
  }

  const raw = await readFile(fixturePath, "utf8");
  const fixture = JSON.parse(raw);
  const decision = decideWebhookAction(fixture.event, fixture.payload);

  console.log(JSON.stringify(decision, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
