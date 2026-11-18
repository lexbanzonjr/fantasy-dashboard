import { describe, expect, it } from "vitest";
import details from "../../fixtures/cbs/league-details.json";
import rosters from "../../fixtures/cbs/league-rosters.json";
import live from "../../fixtures/cbs/league-scoring-live.json";
import rankingsRb from "../../fixtures/cbs/player-rankings-rb.json";
import standings from "../../fixtures/cbs/league-standings.json";
import teams from "../../fixtures/cbs/league-teams.json";
import { myTeamId, normalizePosition, samePosition, toFreeAgents, toLeague, toMatchup, toRoster, toStandings, toTeams } from "@/lib/cbs/mappers";
import {
  leagueDetailsResponse,
  leagueRostersResponse,
  leagueStandingsResponse,
  leagueTeamsResponse,
  liveScoringResponse,
  playerRankingsResponse,
} from "@/lib/cbs/schemas";

describe("toLeague", () => {
  it("maps league details", () => {
    // Arrange
    const parsed = leagueDetailsResponse.parse(details);

    // Act
    const league = toLeague("jjhbffl", parsed);

    // Assert
    expect(league).toEqual({
      id: "jjhbffl",
      name: "Huntington Beach FFL",
      currentPeriod: 10,
      regularSeasonPeriods: 14,
      isPpr: true,
    });
  });
});

describe("toTeams", () => {
  const parsed = leagueTeamsResponse.parse(teams);

  it("maps every team, with owners", () => {
    // Act
    const list = toTeams(parsed);

    // Assert
    expect(list).toHaveLength(10);
    expect(list[0]).toMatchObject({ id: "15", name: "Foot Long Dong", abbr: "FLD", isMine: false });
    // Owner names are scrubbed placeholders in the fixtures.
    expect(list[0]!.owners).toEqual([expect.stringMatching(/^name-\d+$/)]);
  });

  it("flags exactly one team as the token owner's", () => {
    // Act
    const list = toTeams(parsed);

    // Assert
    expect(list.filter((t) => t.isMine)).toHaveLength(1);
  });
});

describe("myTeamId", () => {
  const list = toTeams(leagueTeamsResponse.parse(teams));

  it("finds the token owner's team from logged_in_team", () => {
    // Act
    const result = myTeamId(list);

    // Assert
    expect(result).toBe("23");
  });

  it("returns null when no team is flagged", () => {
    // Arrange
    const unflagged = list.map((t) => ({ ...t, isMine: false }));

    // Act
    const result = myTeamId(unflagged);

    // Assert
    expect(result).toBeNull();
  });
});

describe("toRoster", () => {
  const parsed = leagueRostersResponse.parse(rosters);

  it("maps the team and splits starters from the bench", () => {
    // Act
    const roster = toRoster(parsed, "15")!;

    // Assert
    expect(roster).toMatchObject({ teamId: "15", teamName: "Foot Long Dong", period: 10 });
    expect(roster.players).toHaveLength(15);
    expect(roster.players.filter((p) => p.isStarter)).toHaveLength(9);
  });

  it("maps a player", () => {
    // Act
    const roster = toRoster(parsed, "15")!;

    // Assert
    expect(roster.players.find((p) => p.id === "2181054")).toMatchObject({
      name: "Josh Allen",
      position: "QB",
      slot: "QB",
      proTeam: "BUF",
      byeWeek: 7,
      injury: null,
      isStarter: true,
      opponent: "@NYJ",
      projectedPoints: 12.4,
    });
  });

  it("keeps injury details and marks a bye week", () => {
    // Act
    const roster = toRoster(parsed, "15")!;

    // Assert
    const waddle = roster.players.find((p) => p.id === "2962110")!;
    expect(waddle.injury).toBe("Concussion: Questionable for Week 11 vs. Las Vegas");
    expect(waddle.byeWeek).toBe(10);
    expect(waddle.opponent).toBe("BYE");
  });

  it("returns null for a team that isn't in a multi-team response", () => {
    // Arrange
    const first = parsed.body.rosters.teams[0]!;
    const two = { body: { rosters: { ...parsed.body.rosters, teams: [first, { ...first, id: "99" }] } } };

    // Act
    const result = toRoster(two, "42");

    // Assert
    expect(result).toBeNull();
  });
});

describe("toStandings", () => {
  it("sorts by rank and maps records", () => {
    // Arrange
    const parsed = leagueStandingsResponse.parse(standings);

    // Act
    const rows = toStandings(parsed);

    // Assert
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.rank)).toEqual([...rows.map((r) => r.rank)].sort((a, b) => a - b));
    expect(rows[0]).toMatchObject({
      rank: 1,
      teamId: "21",
      name: "The Knights That Say Nee",
      wins: 8,
      losses: 1,
      ties: 0,
      winPct: 0.889,
      pointsFor: 438,
      pointsAgainst: 342,
      streak: "W8",
    });
  });
});

describe("toMatchup", () => {
  const parsed = liveScoringResponse.parse(live);

  it("defaults to the token owner's team", () => {
    // Act
    const result = toMatchup(parsed);

    // Assert
    expect(result?.mine.teamId).toBe("23");
  });

  it("pairs a team with its opponent", () => {
    // Act
    const m = toMatchup(parsed, "15")!;

    // Assert
    expect(m.period).toBe(10);
    expect(m.status).toBe("in progress");
    expect(m.mine).toMatchObject({ teamId: "15", name: "Foot Long Dong", record: "4-5" });
    expect(m.opponent?.teamId).toBe("10");
  });

  it("has no opponent on a bye", () => {
    // Arrange
    const teams = parsed.body.live_scoring.teams.map((t) => (t.id === "15" ? { ...t, opp_team_id: null } : t));
    const bye = { body: { live_scoring: { ...parsed.body.live_scoring, teams } } };

    // Act
    const result = toMatchup(bye, "15");

    // Assert
    expect(result?.opponent).toBeNull();
  });

  it("returns null for an unknown team", () => {
    // Act
    const result = toMatchup(parsed, "nope");

    // Assert
    expect(result).toBeNull();
  });
});

describe("toFreeAgents", () => {
  const parsed = playerRankingsResponse.parse(rankingsRb);

  it("keeps only unowned players", () => {
    // Act
    const list = toFreeAgents(parsed, 100);

    // Assert
    const ownedIds = rankingsRb.body.rankings.positions[0]!.players.filter((p) => p.owned_by_team_id).map((p) => String(p.id));
    expect(ownedIds.length).toBeGreaterThan(0);
    expect(list.map((p) => p.id)).not.toEqual(expect.arrayContaining([ownedIds[0]]));
    expect(list).toHaveLength(12);
  });

  it("returns the best-ranked first, up to the limit", () => {
    // Act
    const list = toFreeAgents(parsed);

    // Assert
    expect(list).toHaveLength(10);
    const ranks = list.map((p) => p.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("maps injury, waiver status and position", () => {
    // Act
    const achane = toFreeAgents(parsed).find((p) => p.name === "De'Von Achane");

    // Assert
    expect(achane).toMatchObject({ position: "RB", rank: 7, injury: "Knee - ACL: Injured Reserve", onWaivers: true });
  });
});

describe("samePosition", () => {
  it.each([
    ["RB", "RB", true],
    ["RB", "WR", false],
    ["DST", "DEF", true],
    ["K", "PK", true],
    ["te", "TE", true],
    ["", "", false],
  ])("%s vs %s is %s", (a, b, expected) => {
    // Act
    const result = samePosition(a, b);

    // Assert
    expect(result).toBe(expected);
  });

  it("normalizes aliases to CBS names", () => {
    // Act
    const result = normalizePosition(" d/st ");

    // Assert
    expect(result).toBe("DST");
  });
});
