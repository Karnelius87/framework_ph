/* global console, process */

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "local.db");
const migrationsDir = path.join(root, "prisma", "migrations");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "_local_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationNames = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((name) => fs.existsSync(path.join(migrationsDir, name, "migration.sql"))).sort()
    : [];

  for (const name of migrationNames) {
    const alreadyApplied = db.prepare('SELECT 1 FROM "_local_migrations" WHERE "name" = ?').get(name);
    if (alreadyApplied) continue;

    const hasAppTables = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Market'").get();
    const appliedCount = db.prepare('SELECT COUNT(*) as count FROM "_local_migrations"').get().count;
    if (hasAppTables && appliedCount === 0 && name === migrationNames[0]) {
      db.prepare('INSERT INTO "_local_migrations" ("name") VALUES (?)').run(name);
      console.log(`Marked existing migration as applied: ${name}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8");
    db.exec(sql);
    db.prepare('INSERT INTO "_local_migrations" ("name") VALUES (?)').run(name);
    console.log(`Applied migration: ${name}`);
  }

  console.log(`SQLite database ready: ${dbPath}`);
} finally {
  db.close();
}
