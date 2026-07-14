/* global console, process */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const dbPath = path.join(process.cwd(), "data", "local.db");

if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath);
  console.log(`Deleted ${dbPath}`);
}

execFileSync(process.execPath, [path.join("scripts", "apply-local-migration.mjs")], { stdio: "inherit" });
if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/c", "npx", "prisma", "db", "seed"], { stdio: "inherit" });
} else {
  execFileSync("npx", ["prisma", "db", "seed"], { stdio: "inherit" });
}
