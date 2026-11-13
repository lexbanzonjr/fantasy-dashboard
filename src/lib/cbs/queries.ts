import "server-only";
import { cache } from "react";
import { cbsFetch, type CbsAuth } from "./client";
import { connectionToken, readConnection, type Connection } from "./connection";
import { toLeague, toMatchup, toRoster, toStandings, toTeams } from "./mappers";
import {
  leagueDetailsResponse,
  leagueRostersResponse,
  leagueStandingsResponse,
  leagueTeamsResponse,
  liveScoringResponse,
} from "./schemas";

// Standings, teams and rosters change slowly; live scoring isn't cached.
const SLOW = { revalidate: 300 };

export type CbsContext =
  | { status: "disconnected" }
  // Saved, but the token can't be decrypted (CBS_TOKEN_KEY changed, or the row was edited).
  | { status: "broken"; connection: Connection }
  | { status: "connected"; connection: Connection; auth: CbsAuth };

export const getCbsContext = cache((): CbsContext => {
  const connection = readConnection();
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
