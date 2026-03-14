import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "gitpay.db");

const g = global as typeof global & { _db?: Database.Database };

export function getDb(): Database.Database {
  if (!g._db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    g._db = new Database(DB_PATH);
    g._db.pragma("journal_mode = WAL");
    g._db.pragma("busy_timeout = 10000");
    g._db.exec(`
      CREATE TABLE IF NOT EXISTS claims (
        token TEXT PRIMARY KEY,
        github_username TEXT NOT NULL,
        repo TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        pr_url TEXT NOT NULL,
        pr_title TEXT NOT NULL,
        score INTEGER NOT NULL,
        reasoning TEXT NOT NULL,
        category TEXT NOT NULL,
        wallet_address TEXT,
        claimed INTEGER NOT NULL DEFAULT 0,
        tx_hash TEXT,
        explorer_url TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        tx_hash TEXT PRIMARY KEY,
        explorer_url TEXT NOT NULL,
        github_username TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        amount_eth TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        repo TEXT NOT NULL DEFAULT '',
        pr_url TEXT NOT NULL DEFAULT '',
        timestamp TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS connected_repos_v2 (
        repo_full_name TEXT NOT NULL,
        session_id TEXT NOT NULL,
        PRIMARY KEY (repo_full_name, session_id)
      );
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
  return g._db;
}
