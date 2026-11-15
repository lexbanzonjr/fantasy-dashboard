import "server-only";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { createClient, type Client, type InValue } from "@libsql/client";
import { env } from "@/lib/env";
import { MIGRATIONS } from "./migrations";

export type Database = Client;
export type { InValue };

// The schema version lives in its own table, because Turso doesn't reliably keep PRAGMA user_version.
// Local databases made before the switch keep their version in user_version, so we adopt it once.
async function currentVersion(db: Database): Promise<number> {
  await db.execute("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = (await db.execute("SELECT version FROM schema_version")).rows[0];
  if (row) return Number(row.version);
  let legacy = 0;
  try {
    legacy = Number((await db.execute("PRAGMA user_version")).rows[0]?.user_version ?? 0);
  } catch {
    // remote databases may not allow it
  }
  await db.execute({ sql: "INSERT INTO schema_version (version) VALUES (?)", args: [legacy] });
  return legacy;
}

// Applies the migrations a database hasn't had yet, each in its own transaction.
export async function migrate(db: Database) {
  for (let v = await currentVersion(db); v < MIGRATIONS.length; v++) {
    await db.executeMultiple(`BEGIN;\n${MIGRATIONS[v]};\nUPDATE schema_version SET version = ${v + 1};\nCOMMIT;`);
  }
}

// Opens and migrates a database. `url` is a libSQL URL: `file:...`, `:memory:` (tests), or `libsql://...` (Turso).
export async function openDatabase(url: string, authToken?: string): Promise<Database> {
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  const db = createClient({ url, authToken });
  if (url.startsWith("file:")) {
    await db.execute("PRAGMA journal_mode = WAL").catch(() => {});
    await db.execute("PRAGMA busy_timeout = 5000").catch(() => {});
  }
  await db.execute("PRAGMA foreign_keys = ON").catch(() => {});
  await migrate(db);
  return db;
}

// One database per process, shared by route handlers and hot reloads.
const globalForDb = globalThis as unknown as { __fantasyDashboardDb?: Promise<Database> };

export function db(): Promise<Database> {
  if (!globalForDb.__fantasyDashboardDb) {
    const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
    if (process.env.VERCEL && !tursoUrl) {
      // Vercel's disk is temporary, so a local file database would lose its data without warning.
      return Promise.reject(new Error("TURSO_DATABASE_URL is not set. Add the Turso URL and token to the Vercel project."));
    }
    const url = tursoUrl || `file:${path.join(env().dataDir, "fantasy-dashboard.sqlite").replace(/\\/g, "/")}`;
    globalForDb.__fantasyDashboardDb = openDatabase(url, process.env.TURSO_AUTH_TOKEN?.trim() || undefined).catch((err) => {
      globalForDb.__fantasyDashboardDb = undefined;
      throw err;
    });
  }
  return globalForDb.__fantasyDashboardDb;
}

// Tests swap in their own database.
export function setDb(database: Database | undefined) {
  globalForDb.__fantasyDashboardDb = database ? Promise.resolve(database) : undefined;
}

export async function all<T>(sql: string, args: InValue[] = [], database?: Database): Promise<T[]> {
  return (await (database ?? (await db())).execute({ sql, args })).rows as unknown as T[];
}

export async function one<T>(sql: string, args: InValue[] = [], database?: Database): Promise<T | undefined> {
  return (await all<T>(sql, args, database))[0];
}

export const now = () => new Date().toISOString();
