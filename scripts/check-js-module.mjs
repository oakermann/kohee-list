import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Missing file path");
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
const source = fs.readFileSync(resolvedPath, "utf8");

try {
  new vm.SourceTextModule(source, { identifier: resolvedPath });
  process.exit(0);
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
