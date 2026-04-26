import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const files = [
  "index.html",
  "admin.html",
  "login.html",
  "submit.html",
  "mypage.html",
  "assets/common.js",
  "assets/index.js",
  "assets/admin.js",
  "assets/login.js",
  "assets/submit.js",
  "assets/mypage.js",
];

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

async function readNormalized(filePath) {
  const content = await readFile(filePath, "utf8");
  return normalizeNewlines(content);
}

const failures = [];

for (const file of files) {
  const rootPath = path.join(process.cwd(), file);
  const deployPath = path.join(process.cwd(), ".pages-deploy", file);

  let rootContent = "";
  let deployContent = "";

  try {
    rootContent = await readNormalized(rootPath);
  } catch (error) {
    failures.push(`Missing: ${file}`);
    continue;
  }

  try {
    deployContent = await readNormalized(deployPath);
  } catch (error) {
    failures.push(`Missing: .pages-deploy/${file}`);
    continue;
  }

  if (rootContent !== deployContent) {
    failures.push(`Mismatch: ${file} <-> .pages-deploy/${file}`);
  }
}

if (failures.length) {
  console.error("Deploy sync check failed.");
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("Deploy sync check passed.");
}
