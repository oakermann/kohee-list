// Repo safety: no DB files, dumps or backups in git (tracked or untracked-but-not-ignored files).
import { execFileSync } from "node:child_process";
import path from "node:path";

const DB_EXTENSIONS = new Set([
  ".backup",
  ".bak",
  ".db",
  ".db3",
  ".dump",
  ".sqlite",
  ".sqlite3",
]);
const DATA_EXTENSIONS = new Set([".csv", ".json", ".sql", ".txt"]);

function gitFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
}

// SQL lives only in schema.sql and migrations/.
function isAllowedSqlPath(file) {
  return file === "schema.sql" || file.startsWith("migrations/");
}

function isDangerousBackupPath(file) {
  const lower = `/${file.toLowerCase()}`;
  const extension = path.posix.extname(lower);
  if (DB_EXTENSIONS.has(extension)) return true;
  if (extension === ".sql" && !isAllowedSqlPath(file)) return true;
  return /\/(backup|dump)/.test(lower) && DATA_EXTENSIONS.has(extension);
}

const blocked = gitFiles().filter(isDangerousBackupPath).sort();
if (blocked.length) {
  console.error("Repo safety check failed — backup or DB dump-like files:");
  for (const file of blocked) console.error(`- ${file}`);
  console.error(
    "Keep D1 backups outside the repo. SQL belongs in schema.sql or migrations/.",
  );
  process.exit(1);
}
console.log("Repo safety check passed.");
