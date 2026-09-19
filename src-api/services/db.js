import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const defaultDatabasePath = fileURLToPath(new URL("../data/gamers-unite.sqlite", import.meta.url));

export function createDatabase(databasePath = process.env.DATABASE_PATH || defaultDatabasePath) {
  const path = databasePath === ":memory:" ? databasePath : resolve(databasePath);
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      global_name TEXT,
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      discord_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discord_id) REFERENCES users (discord_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
  `);
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_polls (
      id INTEGER PRIMARY KEY,
      event_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('modern', 'classic', 'wildcard')),
      games_json TEXT NOT NULL,
      webhook_message_id TEXT,
      opened_at TEXT,
      warning_sent_at TEXT,
      finalized_at TEXT,
      results_json TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_id, category),
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS event_polls_event_id_idx ON event_polls (event_id)`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id INTEGER NOT NULL,
      discord_id TEXT NOT NULL,
      game_index INTEGER NOT NULL CHECK (game_index BETWEEN 0 AND 2),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (poll_id, discord_id),
      FOREIGN KEY (poll_id) REFERENCES event_polls (id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS poll_votes_poll_id_idx ON poll_votes (poll_id)`);

  return db;
}

