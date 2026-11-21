import { createClient, type Client } from "@libsql/client";
import { describe, expect, it } from "vitest";
import { migrate, openDatabase } from "@/lib/db/index";
import { MIGRATIONS } from "@/lib/db/migrations";

const insert = `INSERT INTO cbs_connection (id, league_id, token_ciphertext, created_at, updated_at) VALUES (?, 'lg', 'ct', 'now', 'now')`;

const schemaVersion = async (db: Client) => Number((await db.execute("SELECT version FROM schema_version")).rows[0]!.version);

describe("openDatabase", () => {
  it("brings a new database up to the latest schema version", async () => {
    // Act
    const db = await openDatabase(":memory:");

    // Assert
    expect(await schemaVersion(db)).toBe(MIGRATIONS.length);
  });

  it("creates the cbs_connection table with every column", async () => {
    // Act
    const db = await openDatabase(":memory:");

    // Assert
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
});

describe("pickup_reports", () => {
  it("allows one report per position, week and player", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    const row = "INSERT INTO pickup_reports VALUES ('RB', 11, 'p1', '{}', 'now')";
    await db.execute(row);

    // Act & Assert
    await expect(db.execute(row)).rejects.toThrow(/UNIQUE|PRIMARY/);
  });
});

describe("cbs_connection", () => {
  it("rejects any id other than 1", async () => {
    // Arrange
    const db = await openDatabase(":memory:");

    // Act & Assert
    await expect(db.execute({ sql: insert, args: [2] })).rejects.toThrow(/CHECK/);
  });

  it("rejects a second connection row", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await db.execute({ sql: insert, args: [1] });

    // Act & Assert
    await expect(db.execute({ sql: insert, args: [1] })).rejects.toThrow(/UNIQUE|PRIMARY/);
  });
});

describe("migrate", () => {
  it("is a no-op on an up-to-date database", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await db.execute({ sql: insert, args: [1] });

    // Act
    await migrate(db);

    // Assert
    expect(Number((await db.execute("SELECT count(*) AS n FROM cbs_connection")).rows[0]!.n)).toBe(1);
  });

  it("adopts the version of a database made before schema_version", async () => {
    // Arrange
    const db = createClient({ url: ":memory:" });
    await db.execute(MIGRATIONS[0]!);
    await db.execute(`PRAGMA user_version = ${MIGRATIONS.length}`);

    // Act
    await migrate(db);

    // Assert
    expect(await schemaVersion(db)).toBe(MIGRATIONS.length);
  });
});
