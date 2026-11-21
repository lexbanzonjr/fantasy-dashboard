"use server";

import { revalidatePath } from "next/cache";
import { requireSignIn } from "@/lib/auth/server";
import { getModel } from "@/lib/ai/model";
import { researchPickups } from "@/lib/ai/pickups";
import { saveReports } from "@/lib/ai/reports";
import { getCbsContext, getFreeAgents, getLeague, getLeagueScoring, getRoster } from "@/lib/cbs/queries";
import { PICKUP_POSITIONS, type PickupPosition } from "@/lib/cbs/types";

export type ResearchResult = { ok: true; researched: number; failed: string[] } | { ok: false; error: string };

// Researches the position's top free agents and replaces the cached run for this week.
export async function runResearch(position: string): Promise<ResearchResult> {
  await requireSignIn();
  if (!PICKUP_POSITIONS.includes(position as PickupPosition)) return { ok: false, error: `Unknown position ${position}.` };
  const ai = getModel();
  if (!ai) return { ok: false, error: "ANTHROPIC_API_KEY isn't set." };
  const cbs = await getCbsContext();
  if (cbs.status !== "connected") return { ok: false, error: "Connect CBS first." };
  const myTeamId = cbs.connection.myTeamId;
  if (!myTeamId) return { ok: false, error: "Your CBS team isn't known. Reconnect in Settings." };

  const [league, roster, agents, scoring] = await Promise.all([
    getLeague(cbs.auth),
    getRoster(cbs.auth, myTeamId),
    getFreeAgents(cbs.auth, position as PickupPosition),
    // Research still runs on the PPR flag alone if CBS won't give the scoring rules.
    getLeagueScoring(cbs.auth).catch((err) => {
      console.error("Couldn't load league scoring rules", err);
      return undefined;
    }),
  ]);
  const results = await researchPickups(ai, agents, {
    roster: roster?.players ?? [],
    isPpr: league.isPpr,
    week: league.currentPeriod,
    scoring,
  });
  const done = results.flatMap((r) => ("report" in r ? [r] : []));
  const failed = results.flatMap((r) => ("error" in r ? [agents.find((a) => a.id === r.playerId)?.name ?? r.playerId] : []));
  if (done.length) await saveReports(position, league.currentPeriod, done);
  revalidatePath("/pickups");
  return { ok: true, researched: done.length, failed };
}
