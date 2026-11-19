import type { PickupReport } from "@/lib/ai/pickups";
import { pickupReportSchema } from "@/lib/ai/pickups";
import { all, db, now, type Database } from "@/lib/db";

export interface CachedReport {
  playerId: string;
  report: PickupReport;
  createdAt: string;
}

// The last research run for a position and week, keyed by player id. Rows that no longer parse are skipped.
export async function getCachedReports(position: string, period: number, database?: Database): Promise<CachedReport[]> {
  const rows = await all<{ player_id: string; report_json: string; created_at: string }>(
    "SELECT player_id, report_json, created_at FROM pickup_reports WHERE position = ? AND period = ?",
    [position, period],
    database ?? (await db()),
  );
  return rows.flatMap((r) => {
    const parsed = pickupReportSchema.safeParse(JSON.parse(r.report_json));
    return parsed.success ? [{ playerId: r.player_id, report: parsed.data, createdAt: r.created_at }] : [];
  });
}

// Replaces the position's cached run for the week with these reports.
export async function saveReports(
  position: string,
  period: number,
  reports: { playerId: string; report: PickupReport }[],
  database?: Database,
): Promise<void> {
  const d = database ?? (await db());
  const at = now();
  await d.batch(
    [
      { sql: "DELETE FROM pickup_reports WHERE position = ? AND period = ?", args: [position, period] },
      ...reports.map((r) => ({
        sql: "INSERT INTO pickup_reports (position, period, player_id, report_json, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [position, period, r.playerId, JSON.stringify(r.report), at],
      })),
    ],
    "write",
  );
}
