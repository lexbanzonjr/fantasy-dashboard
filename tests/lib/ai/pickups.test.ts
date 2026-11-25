import { describe, expect, it, vi } from "vitest";
import type { AiModel } from "@/lib/ai/model";
import { buildPickupPrompt, extractTrace, pickupReportSchema, researchPickup, researchPickups, sanitizeReport, toPickupRows, type PickupReport, type PickupTrace } from "@/lib/ai/pickups";
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
const trace: PickupTrace = { prompt: "p", steps: [{ kind: "search", text: "Free Back news" }] };
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

  it("uses the league's own scoring rules and lineup when given", () => {
    // Arrange
    const scoring = { rules: ["Passing TD: +6", "Reception (TE only): +1.5"], lineup: ["QB ×1", "FLEX ×2"] };

    // Act
    const prompt = buildPickupPrompt(agent, { ...ctx, scoring });

    // Assert
    expect(prompt).toContain("League scoring rules:\n- Passing TD: +6\n- Reception (TE only): +1.5");
    expect(prompt).toContain("Starting lineup: QB ×1, FLEX ×2");
    expect(prompt).not.toContain("PPR league");
  });

  it("falls back to the PPR flag without scoring rules", () => {
    // Act
    const prompt = buildPickupPrompt(agent, { ...ctx, isPpr: false });

    // Assert
    expect(prompt).toContain("standard (non-PPR) league");
    expect(prompt).not.toContain("League scoring rules");
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
    const parse = vi.fn().mockResolvedValue({ parsed_output: report, stop_reason: "end_turn", content: [] });

    // Act
    const result = await researchPickup(fakeAi(parse), agent, ctx);

    // Assert
    expect(result.report).toEqual(report);
    expect(parse.mock.calls[0]![0].tools[0]).toMatchObject({ name: "web_search" });
  });

  it("turns on summarized thinking and returns the prompt and steps as a trace", async () => {
    // Arrange
    const content = [
      { type: "thinking", thinking: "Check his snap share." },
      { type: "server_tool_use", name: "web_search", input: { query: "Free Back snaps" } },
      { type: "text", text: "{\"score\":72}" },
    ];
    const parse = vi.fn().mockResolvedValue({ parsed_output: report, stop_reason: "end_turn", content });

    // Act
    const result = await researchPickup(fakeAi(parse), agent, ctx);

    // Assert
    expect(parse.mock.calls[0]![0].thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(result.trace.prompt).toBe(buildPickupPrompt(agent, ctx));
    expect(result.trace.steps).toEqual([
      { kind: "thinking", text: "Check his snap share." },
      { kind: "search", text: "Free Back snaps" },
    ]);
  });

  it("throws when the model returns no report", async () => {
    // Arrange
    const parse = vi.fn().mockResolvedValue({ parsed_output: null, stop_reason: "max_tokens" });

    // Act & Assert
    await expect(researchPickup(fakeAi(parse), agent, ctx)).rejects.toThrow(/max_tokens/);
  });
});

describe("extractTrace", () => {
  it("keeps thinking, searches and notes in order and leaves out the final report", () => {
    // Arrange
    const content = [
      { type: "thinking", thinking: "First look at injuries." },
      { type: "server_tool_use", name: "web_search", input: { query: "injury news" } },
      { type: "web_search_tool_result", content: [] },
      { type: "text", text: "He is the starter now." },
      { type: "thinking", thinking: "Worth an add." },
      { type: "text", text: "{\"score\":80}" },
    ];

    // Act
    const result = extractTrace("prompt", content);

    // Assert
    expect(result).toEqual({
      prompt: "prompt",
      steps: [
        { kind: "thinking", text: "First look at injuries." },
        { kind: "search", text: "injury news" },
        { kind: "text", text: "He is the starter now." },
        { kind: "thinking", text: "Worth an add." },
      ],
    });
  });

  it("skips empty thinking and searches without a query", () => {
    // Arrange
    const content = [
      { type: "thinking", thinking: "" },
      { type: "server_tool_use", name: "web_search", input: {} },
      { type: "text", text: "{}" },
    ];

    // Act
    const result = extractTrace("prompt", content);

    // Assert
    expect(result.steps).toEqual([]);
  });
});

describe("researchPickups", () => {
  it("keeps results in order and records failures per player", async () => {
    // Arrange
    const agents = ["a", "b", "c"].map((id) => ({ ...agent, id }));
    const research = vi.fn(async (_ai: AiModel, a: FreeAgent) => {
      if (a.id === "b") throw new Error("boom");
      return { report, trace };
    });

    // Act
    const results = await researchPickups(fakeAi(vi.fn()), agents, ctx, 2, research);

    // Assert
    expect(results).toEqual([{ playerId: "a", report, trace }, { playerId: "b", error: "boom" }, { playerId: "c", report, trace }]);
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
      return { report, trace };
    };

    // Act
    await researchPickups(fakeAi(vi.fn()), agents, ctx, 4, research);

    // Assert
    expect(peak).toBe(4);
  });
});

describe("toPickupRows", () => {
  it("puts researched players first by score, then the rest by CBS rank", () => {
    // Arrange
    const agents = [
      { ...agent, id: "a", rank: 1 },
      { ...agent, id: "b", rank: 2 },
      { ...agent, id: "c", rank: 3 },
      { ...agent, id: "d", rank: 4 },
    ];
    const reports = [
      { playerId: "d", report: { ...report, score: 90 } },
      { playerId: "b", report: { ...report, score: 40 } },
    ];

    // Act
    const rows = toPickupRows(agents, reports, roster);

    // Assert
    expect(rows.map((r) => r.agent.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("looks up the suggested drop on my roster", () => {
    // Act
    const [row] = toPickupRows([agent], [{ playerId: agent.id, report }], roster);

    // Assert
    expect(row!.drop?.id).toBe("rb1");
  });

  it("has no report or drop for an unresearched player", () => {
    // Act
    const [row] = toPickupRows([agent], [], roster);

    // Assert
    expect(row).toMatchObject({ report: null, trace: null, drop: null });
  });

  it("carries the cached trace onto the row", () => {
    // Act
    const [row] = toPickupRows([agent], [{ playerId: agent.id, report, trace }], roster);

    // Assert
    expect(row!.trace).toEqual(trace);
  });
});
