import { describe, expect, it } from "vitest";
import leagueRulesJson from "../../fixtures/cbs/league-rules.json";
import categoriesJson from "../../fixtures/cbs/league-scoring-categories.json";
import rulesJson from "../../fixtures/cbs/league-scoring-rules.json";
import { describeRule, toLeagueScoring } from "@/lib/cbs/mappers";
import { leagueRulesResponse, leagueScoringCategoriesResponse, leagueScoringRulesResponse } from "@/lib/cbs/schemas";

const fixtureScoring = () =>
  toLeagueScoring(
    leagueScoringRulesResponse.parse(rulesJson),
    leagueScoringCategoriesResponse.parse(categoriesJson),
    leagueRulesResponse.parse(leagueRulesJson),
  );

// A made-up second league: PPR, 6-point passing TDs, a TE premium, two flex slots.
const otherLeague = () =>
  toLeagueScoring(
    leagueScoringRulesResponse.parse({
      body: {
        scoring_rules: {
          categories: [
            { name: "PaTD", points: "6", bonuses: [], ranges: [] },
            { name: "Recpt", points: "1", bonuses: [], ranges: [] },
            { name: "Odd", points: "2", bonuses: [], ranges: [] },
          ],
          positions: [
            { name: "Recpt", pos: "TE", points: "1.5", bonuses: [], ranges: [] },
            { name: "PaTD", pos: "QB", points: "6", bonuses: [], ranges: [] },
          ],
        },
      },
    }),
    leagueScoringCategoriesResponse.parse({
      body: { categories: { groups: [{ cats: [{ abbr: "PaTD", desc: "Passing TD" }, { abbr: "Recpt", desc: "Reception" }] }] } },
    }),
    leagueRulesResponse.parse({
      body: { rules: { roster: { positions: [{ abbr: "QB", max_active: "1" }, { abbr: "FLEX", max_active: "2" }, { abbr: "IR", max_active: "0" }] } } },
    }),
  );

describe("describeRule", () => {
  it("formats flat points with a sign", () => {
    // Act
    const text = describeRule({ name: "PaInt", points: -1, bonuses: [], ranges: [] });

    // Assert
    expect(text).toBe("-1");
  });

  it("formats per-unit ranges and open-ended bonuses", () => {
    // Act
    const text = describeRule({
      name: "PaYd",
      bonuses: [{ from: "300", to: "+", points: 1 }],
      ranges: [{ from: "301", to: "600", points: 1, per: 50 }],
    });

    // Assert
    expect(text).toBe("+1 per 50 from 301 to 600; +1 bonus at 300+");
  });

  it("formats tiers without a per-unit as brackets", () => {
    // Act
    const text = describeRule({ name: "PA", bonuses: [], ranges: [{ from: "0", to: "0", points: 10 }, { from: "1", to: "3", points: 6 }] });

    // Assert
    expect(text).toBe("0 → +10; 1 to 3 → +6");
  });

  it("returns null for a rule that scores nothing", () => {
    // Act
    const text = describeRule({ name: "Recpt", bonuses: [], ranges: [{ from: null, to: null, points: null }] });

    // Assert
    expect(text).toBeNull();
  });
});

describe("toLeagueScoring", () => {
  it("labels rules with CBS's stat names", () => {
    // Act
    const { rules } = fixtureScoring();

    // Assert
    expect(rules).toContain("Passing TD: +4");
    expect(rules).toContain("Passing Yards: +1 per 50 from 301 to 600; +1 bonus at 300+");
    expect(rules).toContain("Field Goals: +3; +1 bonus at 60 to 100");
    expect(rules).toContain("Passing Interception: -1");
  });

  it("lists a position rule only where it differs from the league-wide one", () => {
    // Act
    const { rules } = fixtureScoring();

    // Assert
    expect(rules).toContain("Rushing and Receiving Yards (WR only): +1 per 50 from 50 to 500; +1 bonus at 100+");
    expect(rules.some((r) => r.startsWith("Passing TD (WR only)"))).toBe(false);
  });

  it("says when receptions score nothing", () => {
    // Act
    const { rules } = fixtureScoring();

    // Assert
    expect(rules).toContain("Reception: 0 (no points per reception)");
  });

  it("lists the starting lineup slots", () => {
    // Act
    const { lineup } = fixtureScoring();

    // Assert
    expect(lineup).toEqual(["QB ×1", "RB ×2", "RB-WR-TE ×1", "WR-TE ×3", "K ×1", "DST ×1"]);
  });

  it("follows another league's rules instead of this one's", () => {
    // Act
    const { rules, lineup } = otherLeague();

    // Assert
    expect(rules).toEqual(["Passing TD: +6", "Reception: +1", "Odd: +2", "Reception (TE only): +1.5"]);
    expect(lineup).toEqual(["QB ×1", "FLEX ×2"]);
  });
});
