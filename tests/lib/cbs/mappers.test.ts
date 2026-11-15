import { describe, expect, it } from "vitest";
import details from "../../fixtures/cbs/league-details.json";
import rosters from "../../fixtures/cbs/league-rosters.json";
import live from "../../fixtures/cbs/league-scoring-live.json";
import standings from "../../fixtures/cbs/league-standings.json";
import teams from "../../fixtures/cbs/league-teams.json";
import { myTeamId, toLeague, toMatchup, toRoster, toStandings, toTeams } from "@/lib/cbs/mappers";
import {
  leagueDetailsResponse,
  leagueRostersResponse,
  leagueStandingsResponse,
  leagueTeamsResponse,
  liveScoringResponse,
} from "@/lib/cbs/schemas";

describe("toLeague", () => {
  it("maps league details", () => {
    const league = toLeague("jjhbffl", leagueDetailsResponse.parse(details));
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
  const list = toTeams(leagueTeamsResponse.parse(teams));

  it("maps every team, with owners", () => {
    expect(list).toHaveLength(10);
    expect(list[0]).toMatchObject({ id: "15", name: "Foot Long Dong", abbr: "FLD", isMine: false });
    // Owner names are scrubbed placeholders in the fixtures.
    expect(list[0]!.owners).toEqual([expect.stringMatching(/^name-\d+$/)]);
  });

  it("finds the token owner's team from logged_in_team", () => {
    expect(myTeamId(list)).toBe("23");
    expect(list.filter((t) => t.isMine)).toHaveLength(1);
  });

  it("returns null when no team is flagged", () => {
    expect(myTeamId(list.map((t) => ({ ...t, isMine: false })))).toBeNull();
  });
});

describe("toRoster", () => {
  const parsed = leagueRostersResponse.parse(rosters);
  const roster = toRoster(parsed, "15")!;

  it("maps the team and splits starters from the bench", () => {
    expect(roster).toMatchObject({ teamId: "15", teamName: "Foot Long Dong", period: 10 });
    expect(roster.players).toHaveLength(15);
    expect(roster.players.filter((p) => p.isStarter)).toHaveLength(9);
  });

  it("maps a player", () => {
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
    const waddle = roster.players.find((p) => p.id === "2962110")!;
    expect(waddle.injury).toBe("Concussion: Questionable for Week 11 vs. Las Vegas");
    expect(waddle.byeWeek).toBe(10);
    expect(waddle.opponent).toBe("BYE");
  });

  it("returns null for a team that isn't in a multi-team response", () => {
    const two = { body: { rosters: { ...parsed.body.rosters, teams: [parsed.body.rosters.teams[0]!, { ...parsed.body.rosters.teams[0]!, id: "99" }] } } };
    expect(toRoster(two, "42")).toBeNull();
  });
});

describe("toStandings", () => {
  const rows = toStandings(leagueStandingsResponse.parse(standings));

  it("sorts by rank and maps records", () => {
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
    expect(toMatchup(parsed)?.mine.teamId).toBe("23");
  });

  it("pairs a team with its opponent", () => {
    const m = toMatchup(parsed, "15")!;
    expect(m.period).toBe(10);
    expect(m.status).toBe("in progress");
    expect(m.mine).toMatchObject({ teamId: "15", name: "Foot Long Dong", record: "4-5" });
    expect(m.opponent?.teamId).toBe("10");
  });

  it("has no opponent on a bye", () => {
    const teams = parsed.body.live_scoring.teams.map((t) => (t.id === "15" ? { ...t, opp_team_id: null } : t));
    const bye = { body: { live_scoring: { ...parsed.body.live_scoring, teams } } };
    expect(toMatchup(bye, "15")?.opponent).toBeNull();
  });

  it("returns null for an unknown team", () => {
    expect(toMatchup(parsed, "nope")).toBeNull();
  });
});
