import { describe, expect, it } from "vitest";
import type { PickupReport, PickupTrace } from "@/lib/ai/pickups";
import { getCachedReports, saveReports } from "@/lib/ai/reports";
import { openDatabase } from "@/lib/db/index";

const report: PickupReport = {
  score: 50, verdict: "watch", newsSummary: "Quiet week.", sources: [], dropPlayerId: null, dropReason: null,
};

describe("pickup report cache", () => {
  it("returns saved reports for the position and week", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await saveReports("RB", 11, [{ playerId: "p1", report }], db);

    // Act
    const cached = await getCachedReports("RB", 11, db);

    // Assert
    expect(cached).toEqual([{ playerId: "p1", report, trace: null, createdAt: expect.any(String) }]);
  });

  it("doesn't return another position or week", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await saveReports("RB", 11, [{ playerId: "p1", report }], db);

    // Act
    const [otherPos, otherWeek] = await Promise.all([getCachedReports("WR", 11, db), getCachedReports("RB", 12, db)]);

    // Assert
    expect(otherPos).toEqual([]);
    expect(otherWeek).toEqual([]);
  });

  it("replaces the previous run on refresh", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await saveReports("RB", 11, [{ playerId: "old", report }], db);

    // Act
    await saveReports("RB", 11, [{ playerId: "new", report }], db);

    // Assert
    expect((await getCachedReports("RB", 11, db)).map((r) => r.playerId)).toEqual(["new"]);
  });

  it("skips a row that no longer matches the schema", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await db.execute("INSERT INTO pickup_reports (position, period, player_id, report_json, created_at) VALUES ('RB', 11, 'bad', '{\"score\":\"x\"}', 'now')");

    // Act
    const cached = await getCachedReports("RB", 11, db);

    // Assert
    expect(cached).toEqual([]);
  });

  it("round-trips the trace saved with a report", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    const trace: PickupTrace = { prompt: "p", steps: [{ kind: "thinking", text: "hmm" }, { kind: "search", text: "q" }] };
    await saveReports("RB", 11, [{ playerId: "p1", report, trace }], db);

    // Act
    const [cached] = await getCachedReports("RB", 11, db);

    // Assert
    expect(cached!.trace).toEqual(trace);
  });

  it("keeps the report when its trace is malformed", async () => {
    // Arrange
    const db = await openDatabase(":memory:");
    await db.execute({
      sql: "INSERT INTO pickup_reports (position, period, player_id, report_json, trace_json, created_at) VALUES ('RB', 11, 'p1', ?, 'not json', 'now')",
      args: [JSON.stringify(report)],
    });

    // Act
    const cached = await getCachedReports("RB", 11, db);

    // Assert
    expect(cached).toEqual([{ playerId: "p1", report, trace: null, createdAt: "now" }]);
  });
});
