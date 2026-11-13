import "server-only";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import { env } from "@/lib/env";
import { MIGRATIONS } from "./migrations";

export type { SQLInputValue };

export interface Database {
  raw: DatabaseSync;
  // A cached prepared statement for `sql`.
  query(sql: string): StatementSync;
  // Runs `fn` in a transaction, committing if it returns and rolling back if it throws.
  transaction<T>(fn: () => T): T;
}

// Applies the migrations a database hasn't had yet, each in its own transaction. Foreign keys are off
// while they run, so a migration can rebuild a table others point at (SQLite's documented way to
// change a CHECK); each is checked for broken references before it commits.
export function migrate(raw: DatabaseSync) {
  const { user_version: done } = raw.prepare("PRAGMA user_version").get() as { user_version: number };
  if (done >= MIGRATIONS.length) return;
  const { foreign_keys: fk } = raw.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
  raw.exec("PRAGMA foreign_keys = OFF");
  try {
    for (let i = done; i < MIGRATIONS.length; i++) {
      raw.exec("BEGIN");
      try {
        raw.exec(MIGRATIONS[i]!);
        const broken = raw.prepare("PRAGMA foreign_key_check").all();
        if (broken.length) throw new Error(`Migration ${i + 1} broke ${broken.length} foreign key reference(s)`);
        raw.exec(`PRAGMA user_version = ${i + 1}`);
        raw.exec("COMMIT");
      } catch (err) {
        raw.exec("ROLLBACK");
        throw err;
      }
    }
  } finally {
    raw.exec(`PRAGMA foreign_keys = ${fk ? "ON" : "OFF"}`);
  }
}

// Opens (creating if needed) and migrates a database. ":memory:" works for tests.
export function openDatabase(file: string): Database {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL");
  raw.exec("PRAGMA synchronous = NORMAL");
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA busy_timeout = 5000");
  migrate(raw);

  const statements = new Map<string, StatementSync>();
  let depth = 0;
  return {
    raw,
    query(sql) {
      let statement = statements.get(sql);
      if (!statement) {
        statement = raw.prepare(sql);
        statements.set(sql, statement);
      }
      return statement;
    },
    transaction(fn) {
      // Nested calls join the outer transaction.
      if (depth > 0) return fn();
      raw.exec("BEGIN IMMEDIATE");
      depth++;
      try {
        const result = fn();
        raw.exec("COMMIT");
        return result;
      } catch (err) {
        raw.exec("ROLLBACK");
        throw err;
      } finally {
        depth--;
      }
    },
  };
}

// One database per process, shared by instrumentation, route handlers and hot reloads.
const globalForDb = globalThis as unknown as { __fantasyDashboardDb?: Database };

export function db(): Database {
  return (globalForDb.__fantasyDashboardDb ??= openDatabase(path.join(env().dataDir, "fantasy-dashboard.sqlite")));
}

// Tests swap in their own database.
export function setDb(database: Database | undefined) {
  globalForDb.__fantasyDashboardDb = database;
}

export const now = () => new Date().toISOString();
