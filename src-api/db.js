import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const defaultDatabasePath = resolve(dirname(fileURLToPath(import.meta.url)), "data/gamers-unite.sqlite");

export function createDatabase(databasePath = process.env.DATABASE_PATH || defaultDatabasePath) {
  const path = databasePath === ":memory:" ? databasePath : resolve(databasePath);
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_recommendations (
      id INTEGER PRIMARY KEY,
      game_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      recommended_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Gallery events (past LANs) and their photos. Images are stored in S3;
  // this table is the source of truth for which images belong to which
  // event, their order, and which one is the event's cover photo. S3 keys
  // (images/<event-slug>/<id>) are just where the bytes happen to live.
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT '10:00',
      end_time TEXT NOT NULL DEFAULT '18:00',
      season TEXT,
      cover_image_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cover_image_id) REFERENCES images (id) ON DELETE SET NULL
    )
  `);
  const eventColumns = db.prepare("PRAGMA table_info(events)").all();
  if (!eventColumns.some(({ name }) => name === "start_time")) {
    db.exec("ALTER TABLE events ADD COLUMN start_time TEXT NOT NULL DEFAULT '10:00'");
  }
  if (!eventColumns.some(({ name }) => name === "end_time")) {
    db.exec("ALTER TABLE events ADD COLUMN end_time TEXT NOT NULL DEFAULT '18:00'");
  }
  if (!eventColumns.some(({ name }) => name === "season")) {
    db.exec("ALTER TABLE events ADD COLUMN season TEXT");
  }
  if (!eventColumns.some(({ name }) => name === "gallery_visible")) {
    db.exec("ALTER TABLE events ADD COLUMN gallery_visible INTEGER NOT NULL DEFAULT 1");
  }
  if (!eventColumns.some(({ name }) => name === "show_cover_image")) {
    db.exec("ALTER TABLE events ADD COLUMN show_cover_image INTEGER NOT NULL DEFAULT 1");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      event_id INTEGER NOT NULL,
      storage_key TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    )
  `);
  const imageColumns = db.prepare("PRAGMA table_info(images)").all();
  if (!imageColumns.some(({ name }) => name === "display_order")) {
    db.exec("ALTER TABLE images ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0");
  }
  db.exec(`CREATE INDEX IF NOT EXISTS images_event_id_idx ON images (event_id)`);

  return db;
}
