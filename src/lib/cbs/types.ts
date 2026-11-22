// What the app works with. Mappers build these from raw CBS responses; nothing else sees raw shapes.

export interface League {
  id: string;
  name: string;
  currentPeriod: number;
  regularSeasonPeriods: number;
  isPpr: boolean;
}

export interface Team {
  id: string;
  name: string;
  abbr: string;
  logo: string | null;
  owners: string[];
  // The team of the person whose token this is.
  isMine: boolean;
}

export interface RosterPlayer {
  id: string;
  name: string;
  position: string;
  // The lineup slot, e.g. "RB" or "WR-TE".
  slot: string;
  proTeam: string;
  byeWeek: number | null;
  // e.g. "Concussion: Questionable for Week 11 vs. Las Vegas".
  injury: string | null;
  isStarter: boolean;
  // e.g. "@NYJ", "BYE", or null when unknown.
  opponent: string | null;
  projectedPoints: number | null;
  photo: string | null;
}

export interface TeamRoster {
  teamId: string;
  teamName: string;
  period: number;
  projectedPoints: number | null;
  players: RosterPlayer[];
}

export interface StandingRow {
  rank: number;
  teamId: string;
  name: string;
  logo: string | null;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
}

export interface MatchupSide {
  teamId: string;
  name: string;
  logo: string | null;
  points: number;
  record: string;
  // Starters who haven't played yet this period.
  yetToPlay: number | null;
}

export interface Matchup {
  period: number;
  status: string;
  mine: MatchupSide;
  // Null on a bye week.
  opponent: MatchupSide | null;
}

// The positions you can look for pickups at, as CBS names them.
export const PICKUP_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
export type PickupPosition = (typeof PICKUP_POSITIONS)[number];

// An unowned player, from CBS's rankings at one position.
export interface FreeAgent {
  id: string;
  name: string;
  position: string;
  proTeam: string;
  // CBS's rank at the position (1 = best), across all players, owned or not.
  rank: number;
  byeWeek: number | null;
  injury: string | null;
  // On waivers means a claim (FAAB bid) rather than an instant add.
  onWaivers: boolean;
  // e.g. "TEN", or "Bye: 6".
  opponent: string | null;
  photo: string | null;
}

// A league's scoring, as short lines for the AI prompt. Built from CBS, so it differs by league.
export interface LeagueScoring {
  // e.g. "Passing TD: 4", "Passing Yards: +1 per 50 from 301 to 600; +1 bonus at 300+".
  rules: string[];
  // Starting slots, e.g. "QB ×1", "RB-WR-TE ×1".
  lineup: string[];
}
