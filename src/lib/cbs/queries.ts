import "server-only";
import { cache } from "react";
import { cbsFetch, type CbsAuth } from "./client";
import type { PickupPosition } from "./types";
import { connectionToken, readConnection, type Connection } from "./connection";
import { toFreeAgents, toLeague, toLeagueScoring, toMatchup, toRoster, toStandings, toTeams } from "./mappers";
import {
  leagueDetailsResponse,
  leagueRostersResponse,
  leagueRulesResponse,
  leagueScoringCategoriesResponse,
  leagueScoringRulesResponse,
  leagueStandingsResponse,
  leagueTeamsResponse,
  liveScoringResponse,
  playerRankingsResponse,
} from "./schemas";

// Standings, teams and rosters change slowly; live scoring isn't cached.
const SLOW = { revalidate: 300 };

export type CbsContext =
  | { status: "disconnected" }
  // Saved, but the token can't be decrypted (CBS_TOKEN_KEY changed, or the row was edited).
  | { status: "broken"; connection: Connection }
  | { status: "connected"; connection: Connection; auth: CbsAuth };

export const getCbsContext = cache(async (): Promise<CbsContext> => {
  const connection = await readConnection();
  if (!connection) return { status: "disconnected" };
  const token = connectionToken(connection);
  if (!token) return { status: "broken", connection };
  return { status: "connected", connection, auth: { token, leagueId: connection.leagueId } };
});

export const getLeague = cache(async (auth: CbsAuth) =>
  toLeague(auth.leagueId, await cbsFetch(leagueDetailsResponse, "league/details", auth, {}, SLOW)),
);

export const getTeams = cache(async (auth: CbsAuth) => toTeams(await cbsFetch(leagueTeamsResponse, "league/teams", auth, {}, SLOW)));

export const getRoster = cache(async (auth: CbsAuth, teamId: string) =>
  toRoster(await cbsFetch(leagueRostersResponse, "league/rosters", auth, { team_id: teamId }, SLOW), teamId),
);

export const getStandings = cache(async (auth: CbsAuth) =>
  toStandings(await cbsFetch(leagueStandingsResponse, "league/standings/overall", auth, {}, SLOW)),
);

export const getMatchup = cache(async (auth: CbsAuth, teamId: string | null) =>
  toMatchup(await cbsFetch(liveScoringResponse, "league/scoring/live", auth), teamId),
);

// The top unowned players at a position, by CBS's ranking.
export const getFreeAgents = cache(async (auth: CbsAuth, position: PickupPosition, limit = 10) =>
  toFreeAgents(await cbsFetch(playerRankingsResponse, "players/rankings", auth, { position }, SLOW), limit),
);

// The connected league's scoring rules and starting lineup.
export const getLeagueScoring = cache(async (auth: CbsAuth) => {
  const [rules, categories, leagueRules] = await Promise.all([
    cbsFetch(leagueScoringRulesResponse, "league/scoring/rules", auth, {}, SLOW),
    cbsFetch(leagueScoringCategoriesResponse, "league/scoring/categories", auth, {}, SLOW),
    cbsFetch(leagueRulesResponse, "league/rules", auth, {}, SLOW),
  ]);
  return toLeagueScoring(rules, categories, leagueRules);
});
