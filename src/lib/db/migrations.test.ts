import { describe, expect, it } from "vitest";
import { migrate, openDatabase } from "./index";
import { MIGRATIONS } from "./migrations";

const insert = `INSERT INTO cbs_connection (id, league_id, token_ciphertext, created_at, updated_at) VALUES (?, 'lg', 'ct', 'now', 'now')`;

describe("migrations", () => {
  it("bring a new database up to date", async () => {
    const db = await openDatabase(":memory:");
    expect(Number((await db.execute("SELECT version FROM schema_version")).rows[0]!.version)).toBe(MIGRATIONS.length);
    const cols = (await db.execute("PRAGMA table_info(cbs_connection)")).rows.map((c) => c.name);
    expect(cols).toEqual([
      "id",
      "league_id",
      "league_name",
      "my_team_id",
      "token_ciphertext",
      "token_updated_at",
      "last_verified_at",
      "created_at",
      "updated_at",
    ]);
  });

  it("allow only one connection row", async () => {
    const db = await openDatabase(":memory:");
    await db.execute({ sql: insert, args: [1] });
    await expect(db.execute({ sql: insert, args: [2] })).rejects.toThrow(/CHECK/);
    await expect(db.execute({ sql: insert, args: [1] })).rejects.toThrow(/UNIQUE|PRIMARY/);
  });

  it("are a no-op the second time", async () => {
    const db = await openDatabase(":memory:");
    await db.execute({ sql: insert, args: [1] });
    await migrate(db);
    expect(Number((await db.execute("SELECT count(*) AS n FROM cbs_connection")).rows[0]!.n)).toBe(1);
  });

  it("adopt the version of a database made before schema_version", async () => {
    const { createClient } = await import("@libsql/client");
    const db = createClient({ url: ":memory:" });
    await db.execute(MIGRATIONS[0]!);
    await db.execute(`PRAGMA user_version = ${MIGRATIONS.length}`);
    await migrate(db);
    expect(Number((await db.execute("SELECT version FROM schema_version")).rows[0]!.version)).toBe(MIGRATIONS.length);
  });
});
