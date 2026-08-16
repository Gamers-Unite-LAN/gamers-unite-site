import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const defaultDatabasePath = resolve("src-api/data/gamers-unite.sqlite");

export function createDatabase(databasePath = process.env.DATABASE_PATH || defaultDatabasePath) {
  const path = databasePath === ":memory:" ? databasePath : resolve(databasePath);
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_recommendations (
      id INTEGER PRIMARY KEY,
      game_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      recommended_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}
