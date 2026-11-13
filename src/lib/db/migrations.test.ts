import { describe, expect, it } from "vitest";
import { openDatabase } from "./index";
import { MIGRATIONS } from "./migrations";

const insert = `INSERT INTO cbs_connection (id, league_id, token_ciphertext, created_at, updated_at) VALUES (?, 'lg', 'ct', 'now', 'now')`;

describe("migrations", () => {
  it("bring a new database up to date", () => {
    const db = openDatabase(":memory:");
    expect(db.raw.prepare("PRAGMA user_version").get()).toEqual({ user_version: MIGRATIONS.length });
    const cols = db.raw.prepare("PRAGMA table_info(cbs_connection)").all().map((c) => (c as { name: string }).name);
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

  it("allow only one connection row", () => {
    const db = openDatabase(":memory:");
    db.query(insert).run(1);
    expect(() => db.query(insert).run(2)).toThrow(/CHECK/);
    expect(() => db.query(insert).run(1)).toThrow(/UNIQUE|PRIMARY/);
  });

  it("are a no-op the second time", () => {
    const db = openDatabase(":memory:");
    db.query(insert).run(1);
    expect(() => db.transaction(() => db.query("SELECT 1").get())).not.toThrow();
    expect(db.raw.prepare("SELECT count(*) AS n FROM cbs_connection").get()).toEqual({ n: 1 });
  });
});
