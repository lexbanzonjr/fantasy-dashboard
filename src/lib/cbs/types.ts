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
