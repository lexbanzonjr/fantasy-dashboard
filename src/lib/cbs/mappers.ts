import type {
  LeagueRulesResponse,
  LeagueScoringCategoriesResponse,
  LeagueScoringRulesResponse,
  ScoringRuleRaw,
  LeagueDetailsResponse,
  LeagueRostersResponse,
  LeagueStandingsResponse,
  LeagueTeamsResponse,
  LiveScoringResponse,
  PlayerRankingsResponse,
} from "./schemas";
import type { FreeAgent, League, LeagueScoring, Matchup, MatchupSide, RosterPlayer, StandingRow, Team, TeamRoster } from "./types";

// Pure functions from parsed CBS responses to the app's types.

export function toLeague(leagueId: string, res: LeagueDetailsResponse): League {
  const d = res.body.league_details;
  return {
    id: leagueId,
    name: d.name.trim(),
    currentPeriod: d.current_period,
    regularSeasonPeriods: d.regular_season_periods,
    isPpr: d.is_ppr ?? false,
  };
}

export function toTeams(res: LeagueTeamsResponse): Team[] {
  return res.body.teams.map((t) => ({
    id: t.id,
    name: t.name.trim(),
    abbr: t.abbr,
    logo: t.logo,
    owners: t.owners.map((o) => o.name?.trim()).filter((n): n is string => !!n),
    isMine: t.logged_in_team ?? false,
  }));
}

export function myTeamId(teams: Team[]): string | null {
  return teams.find((t) => t.isMine)?.id ?? null;
}

type RawPlayer = LeagueRostersResponse["body"]["rosters"]["teams"][number]["players"][number];

function toPlayer(p: RawPlayer): RosterPlayer {
  const opponent = p.opponent ?? p.opponents?.find((o) => o.abbrev)?.abbrev ?? null;
  return {
    id: p.id,
    name: p.fullname.trim(),
    position: p.position,
    slot: p.roster_pos,
    proTeam: p.pro_team,
    byeWeek: p.bye_week ?? null,
    injury: p.icons?.injury?.trim() || p.injury,
    isStarter: p.roster_status === "A",
    opponent,
    projectedPoints: p.projected_points ?? null,
    photo: p.photo,
  };
}

export function toRoster(res: LeagueRostersResponse, teamId: string): TeamRoster | null {
  const { period, teams } = res.body.rosters;
  const team = teams.find((t) => t.id === teamId) ?? (teams.length === 1 ? teams[0] : undefined);
  if (!team) return null;
  return {
    teamId: team.id,
    teamName: team.name.trim(),
    period,
    projectedPoints: team.projected_points ?? null,
    players: team.players.map(toPlayer),
  };
}

export function toStandings(res: LeagueStandingsResponse): StandingRow[] {
  return res.body.overall_standings.teams
    .map((t) => ({
      rank: t.order,
      teamId: t.id,
      name: t.name.trim(),
      logo: t.logo,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      winPct: t.winning_pct,
      pointsFor: t.points_scored,
      pointsAgainst: t.points_against,
      streak: t.streak,
    }))
    .sort((a, b) => a.rank - b.rank);
}

type LiveTeam = LiveScoringResponse["body"]["live_scoring"]["teams"][number];

function toSide(t: LiveTeam): MatchupSide {
  return { teamId: t.id, name: t.name.trim(), logo: t.logo, points: t.pts, record: t.record, yetToPlay: t.ytp ?? null };
}

// This period's matchup for `teamId` (default: the token owner's team). Null if the team isn't found.
export function toMatchup(res: LiveScoringResponse, teamId?: string | null): Matchup | null {
  const live = res.body.live_scoring;
  const id = teamId ?? live.my_team_id;
  const mine = live.teams.find((t) => t.id === id);
  if (!mine) return null;
  const opp = mine.opp_team_id ? live.teams.find((t) => t.id === mine.opp_team_id) : undefined;
  return { period: live.period, status: live.matchup_status, mine: toSide(mine), opponent: opp ? toSide(opp) : null };
}

// CBS uses a few names for the same slot. Defense and kicker are the ones that vary.
const POSITION_ALIASES: Record<string, string> = { DEF: "DST", "D/ST": "DST", PK: "K" };

export function normalizePosition(position: string): string {
  const p = position.trim().toUpperCase();
  return POSITION_ALIASES[p] ?? p;
}

// An add/drop has to keep the roster's positions the same.
export function samePosition(a: string, b: string): boolean {
  return !!a.trim() && normalizePosition(a) === normalizePosition(b);
}

// The best-ranked unowned players, best first.
export function toFreeAgents(res: PlayerRankingsResponse, limit = 10): FreeAgent[] {
  return res.body.rankings.positions
    .flatMap((pos) => pos.players)
    .filter((p) => !p.owned_by_team_id)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.fullname.trim(),
      position: p.position,
      proTeam: p.pro_team,
      rank: p.rank,
      byeWeek: p.bye_week ?? null,
      injury: p.icons?.injury?.trim() || null,
      onWaivers: p.on_waivers ?? false,
      opponent: p.opponent,
      photo: p.photo,
    }));
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const span = (from: string | null, to: string | null) =>
  to === "+" || to === null ? `${from}+` : from === to ? `${from}` : `${from} to ${to}`;

// One rule as text, or null when it scores nothing. Ranges with `per` are "points per N units";
// ranges without are tiers (e.g. points allowed 0 → +10).
export function describeRule(rule: ScoringRuleRaw): string | null {
  const parts: string[] = [];
  if (rule.points !== null && rule.points !== undefined && rule.points !== 0) parts.push(signed(rule.points));
  for (const r of rule.ranges) {
    if (r.points === null || r.from === null) continue;
    if (r.per) parts.push(`${signed(r.points)} per ${r.per} from ${span(r.from, r.to)}`);
    else parts.push(`${span(r.from, r.to)} → ${signed(r.points)}`);
  }
  for (const b of rule.bonuses) {
    if (b.points === null || b.from === null) continue;
    parts.push(`${signed(b.points)} bonus at ${span(b.from, b.to)}`);
  }
  return parts.length ? parts.join("; ") : null;
}

// The league's scoring and lineup, whatever they are. Position-specific rules are listed only
// where they differ from the league-wide rule for that stat.
export function toLeagueScoring(
  rules: LeagueScoringRulesResponse,
  categories: LeagueScoringCategoriesResponse,
  leagueRules: LeagueRulesResponse,
): LeagueScoring {
  const label = new Map(categories.body.categories.groups.flatMap((g) => g.cats.map((c) => [c.abbr, c.desc?.trim() || c.abbr])));
  const name = (abbr: string) => label.get(abbr) ?? abbr;
  const { categories: base, positions } = rules.body.scoring_rules;

  const baseText = new Map(base.map((r) => [r.name, describeRule(r)]));
  const lines = base.flatMap((r) => {
    const text = baseText.get(r.name);
    return text ? [`${name(r.name)}: ${text}`] : [];
  });
  for (const r of positions) {
    const text = describeRule(r);
    if (text && r.pos && text !== baseText.get(r.name)) lines.push(`${name(r.name)} (${r.pos} only): ${text}`);
  }
  if (!base.some((r) => r.name === "Recpt" && baseText.get("Recpt")) && !positions.some((r) => r.name === "Recpt" && describeRule(r))) {
    lines.push("Reception: 0 (no points per reception)");
  }

  const lineup = (leagueRules.body.rules.roster?.positions ?? [])
    .filter((p) => (p.max_active ?? 0) > 0)
    .map((p) => `${p.abbr} ×${p.max_active}`);
  return { rules: lines, lineup };
}
