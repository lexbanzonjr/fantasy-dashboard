import { describe, expect, it, vi } from "vitest";
import type { AiModel } from "@/lib/ai/model";
import { buildPickupPrompt, pickupReportSchema, researchPickup, researchPickups, sanitizeReport, type PickupReport } from "@/lib/ai/pickups";
import type { FreeAgent, RosterPlayer } from "@/lib/cbs/types";

const agent: FreeAgent = {
  id: "fa1", name: "Free Back", position: "RB", proTeam: "TEN", rank: 30, byeWeek: 6,
  injury: null, onWaivers: true, opponent: "@HOU", photo: null,
};
const player = (id: string, position: string, extra: Partial<RosterPlayer> = {}): RosterPlayer => ({
  id, name: `Player ${id}`, position, slot: position, proTeam: "NYJ", byeWeek: 9, injury: null,
  isStarter: false, opponent: "BUF", projectedPoints: 7.5, photo: null, ...extra,
});
const roster = [player("rb1", "RB", { injury: "Ankle: Out" }), player("wr1", "WR"), player("rb2", "RB", { isStarter: true })];
const ctx = { roster, isPpr: true, week: 11 };
const report: PickupReport = {
  score: 72, verdict: "add", newsSummary: "Starter hurt.", sources: [{ title: "News", url: "https://x.test" }],
  dropPlayerId: "rb1", dropReason: "Out for the season.",
};
const fakeAi = (parse: ReturnType<typeof vi.fn>) => ({ client: { messages: { parse } }, model: "m" }) as unknown as AiModel;

describe("pickupReportSchema", () => {
  it("rejects a score above 100", () => {
    // Act
    const result = pickupReportSchema.safeParse({ ...report, score: 101 });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("buildPickupPrompt", () => {
  it("lists only my same-position players as drop options", () => {
    // Act
    const prompt = buildPickupPrompt(agent, ctx);

    // Assert
    expect(prompt).toContain("id rb1");
    expect(prompt).toContain("id rb2");
    expect(prompt).not.toContain("id wr1");
  });

  it("includes the week, scoring, waiver status and injuries", () => {
    // Act
    const prompt = buildPickupPrompt(agent, ctx);

    // Assert
    expect(prompt).toContain("week 11");
    expect(prompt).toContain("PPR");
    expect(prompt).toContain("on waivers");
    expect(prompt).toContain("Ankle: Out");
  });

  it("says none when I have nobody at the position", () => {
    // Act
    const prompt = buildPickupPrompt({ ...agent, position: "TE" }, ctx);

    // Assert
    expect(prompt).toContain("- (none)");
  });
});

describe("sanitizeReport", () => {
  it("keeps a drop pick at the same position", () => {
    // Act
    const result = sanitizeReport(report, agent, roster);

    // Assert
    expect(result.dropPlayerId).toBe("rb1");
  });

  it("clears a drop pick at another position", () => {
    // Act
    const result = sanitizeReport({ ...report, dropPlayerId: "wr1" }, agent, roster);

    // Assert
    expect(result).toMatchObject({ dropPlayerId: null, dropReason: null });
  });

  it("clears a drop pick that isn't on my roster", () => {
    // Act
    const result = sanitizeReport({ ...report, dropPlayerId: "nobody" }, agent, roster);

    // Assert
    expect(result.dropPlayerId).toBeNull();
  });
});

describe("researchPickup", () => {
  it("asks the model with web search and returns the parsed report", async () => {
    // Arrange
    const parse = vi.fn().mockResolvedValue({ parsed_output: report, stop_reason: "end_turn" });

    // Act
    const result = await researchPickup(fakeAi(parse), agent, ctx);

    // Assert
    expect(result).toEqual(report);
    expect(parse.mock.calls[0]![0].tools[0]).toMatchObject({ name: "web_search" });
  });

  it("throws when the model returns no report", async () => {
    // Arrange
    const parse = vi.fn().mockResolvedValue({ parsed_output: null, stop_reason: "max_tokens" });

    // Act & Assert
    await expect(researchPickup(fakeAi(parse), agent, ctx)).rejects.toThrow(/max_tokens/);
  });
});

describe("researchPickups", () => {
  it("keeps results in order and records failures per player", async () => {
    // Arrange
    const agents = ["a", "b", "c"].map((id) => ({ ...agent, id }));
    const research = vi.fn(async (_ai: AiModel, a: FreeAgent) => {
      if (a.id === "b") throw new Error("boom");
      return report;
    });

    // Act
    const results = await researchPickups(fakeAi(vi.fn()), agents, ctx, 2, research);

    // Assert
    expect(results).toEqual([{ playerId: "a", report }, { playerId: "b", error: "boom" }, { playerId: "c", report }]);
  });

  it("runs no more than the concurrency limit at once", async () => {
    // Arrange
    const agents = Array.from({ length: 10 }, (_, i) => ({ ...agent, id: String(i) }));
    let running = 0;
    let peak = 0;
    const research = async () => {
      peak = Math.max(peak, ++running);
      await new Promise((r) => setTimeout(r, 1));
      running--;
      return report;
    };

    // Act
    await researchPickups(fakeAi(vi.fn()), agents, ctx, 4, research);

    // Assert
    expect(peak).toBe(4);
  });
});
