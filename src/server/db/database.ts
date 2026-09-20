import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'discordhost.db');

let db: SqlJsDatabase | null = null;

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      plan_id TEXT,
      storage_used_mb REAL DEFAULT 0,
      suspended INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      discord_id TEXT,
      discord_tag TEXT,
      discord_avatar TEXT,
      discord_banner TEXT,
      discord_display_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Add columns if missing (migration)
  try { db.run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN discord_id TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN discord_tag TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN discord_avatar TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN discord_banner TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN discord_display_name TEXT"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      runtime TEXT NOT NULL,
      status TEXT DEFAULT 'stopped',
      token TEXT,
      startup_command TEXT,
      working_directory TEXT,
      ram_mb INTEGER DEFAULT 128,
      cpu_percent REAL DEFAULT 0,
      uptime_ms INTEGER DEFAULT 0,
      auto_restart INTEGER DEFAULT 0,
      env_vars TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bot_logs (
      id TEXT PRIMARY KEY,
      bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hosting_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      ram_mb INTEGER NOT NULL,
      cpu_percent REAL NOT NULL,
      storage_mb INTEGER NOT NULL,
      max_bots INTEGER NOT NULL,
      features TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS branding_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      last_used_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bot_ads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      link_url TEXT,
      button_text TEXT DEFAULT 'Learn More',
      max_uses INTEGER DEFAULT 0,
      current_uses INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  saveDb();
  return db;
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function dbAll(sql: string, params: any[] = []): any[] {
  const stmt = db!.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function dbGet(sql: string, params: any[] = []): any | undefined {
  const stmt = db!.prepare(sql);
  stmt.bind(params);
  let result: any = undefined;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function dbRun(sql: string, params: any[] = []): void {
  db!.run(sql, params);
  saveDb();
}

export function dbRunAndId(sql: string, params: any[] = []): string | null {
  db!.run(sql, params);
  const row = dbGet('SELECT last_insert_rowid() as id');
  saveDb();
  return row?.id ? String(row.id) : null;
}

export { saveDb };
