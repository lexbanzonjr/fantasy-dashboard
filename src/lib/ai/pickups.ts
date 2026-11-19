import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AiModel } from "@/lib/ai/model";
import { samePosition } from "@/lib/cbs/mappers";
import type { FreeAgent, RosterPlayer } from "@/lib/cbs/types";

export const pickupReportSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["add", "watch", "pass"]),
  newsSummary: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  // One of my same-position players, or null when nobody is worth dropping for him.
  dropPlayerId: z.string().nullable(),
  dropReason: z.string().nullable(),
});
export type PickupReport = z.infer<typeof pickupReportSchema>;

export interface PickupContext {
  // My rostered players; only the same-position ones are offered as drops.
  roster: RosterPlayer[];
  isPpr: boolean;
  week: number;
}

const describe = (p: { name: string; position: string; proTeam: string; byeWeek: number | null; injury: string | null; opponent: string | null }) =>
  `${p.name} (${p.position}, ${p.proTeam}) — bye ${p.byeWeek ?? "unknown"}, injury: ${p.injury ?? "none"}, opponent: ${p.opponent ?? "unknown"}`;

export function dropCandidates(agent: FreeAgent, roster: RosterPlayer[]): RosterPlayer[] {
  return roster.filter((p) => samePosition(p.position, agent.position));
}

export function buildPickupPrompt(agent: FreeAgent, ctx: PickupContext): string {
  const mine = dropCandidates(agent, ctx.roster);
  const myLines = mine.length
    ? mine.map((p) => `- id ${p.id}: ${describe(p)}, projected ${p.projectedPoints ?? "n/a"} pts, ${p.isStarter ? "starter" : "bench"}`).join("\n")
    : "- (none)";
  return [
    `You are a fantasy football analyst. It is week ${ctx.week} of a ${ctx.isPpr ? "PPR" : "standard (non-PPR)"} league.`,
    `Free agent: ${describe(agent)}, CBS position rank ${agent.rank}${agent.onWaivers ? ", on waivers (needs a FAAB claim)" : ""}.`,
    `My players at the same position:\n${myLines}`,
    "Search the web for this player's latest news (injuries, depth chart, usage, matchups) from the past two weeks.",
    "Score how much adding him would help my team from 0 to 100 and give a verdict: add, watch, or pass.",
    "Summarize the news in 2-3 sentences and list the pages you used as sources.",
    "If adding him is worth it, set dropPlayerId to the id of one of my players above (only those ids) and say why; otherwise null.",
  ].join("\n\n");
}

// Drops the model's drop pick if it isn't one of my same-position players.
export function sanitizeReport(report: PickupReport, agent: FreeAgent, roster: RosterPlayer[]): PickupReport {
  const ok = report.dropPlayerId !== null && dropCandidates(agent, roster).some((p) => p.id === report.dropPlayerId);
  return ok ? report : { ...report, dropPlayerId: null, dropReason: null };
}

export async function researchPickup(ai: AiModel, agent: FreeAgent, ctx: PickupContext): Promise<PickupReport> {
  const res = await ai.client.messages.parse({
    model: ai.model,
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    output_config: { format: zodOutputFormat(pickupReportSchema) },
    messages: [{ role: "user", content: buildPickupPrompt(agent, ctx) }],
  });
  if (!res.parsed_output) throw new Error(`No report for ${agent.name} (stop reason: ${res.stop_reason}).`);
  return sanitizeReport(res.parsed_output, agent, ctx.roster);
}

export type PickupResult = { playerId: string; report: PickupReport } | { playerId: string; error: string };

// Researches every free agent, a few at a time. One player failing doesn't sink the rest.
export async function researchPickups(
  ai: AiModel,
  agents: FreeAgent[],
  ctx: PickupContext,
  concurrency = 4,
  research = researchPickup,
): Promise<PickupResult[]> {
  const results: PickupResult[] = new Array(agents.length);
  let next = 0;
  const worker = async () => {
    while (next < agents.length) {
      const i = next++;
      const agent = agents[i]!;
      try {
        results[i] = { playerId: agent.id, report: await research(ai, agent, ctx) };
      } catch (e) {
        results[i] = { playerId: agent.id, error: e instanceof Error ? e.message : String(e) };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, agents.length) }, worker));
  return results;
}
