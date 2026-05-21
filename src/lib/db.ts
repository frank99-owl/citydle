// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;

export function getDb() {
  if (!dbInstance) {
    const DB_DIR = path.join(process.cwd(), 'data');
    const DB_PATH = path.join(DB_DIR, 'cartographer.db');

    // Ensure data directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);

    // Enable WAL mode and foreign keys via SQL PRAGMAs
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');

    // Initialize tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorite_maps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        name TEXT NOT NULL,
        city_name TEXT,
        bounds TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        map_name TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        total_streets INTEGER NOT NULL DEFAULT 0,
        completion_rate REAL NOT NULL DEFAULT 0,
        max_streak INTEGER NOT NULL DEFAULT 0,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS street_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bounds_key TEXT UNIQUE NOT NULL,
        streets_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO users (id, username) VALUES (1, 'Player');
    `);
  }
  return dbInstance;
}
