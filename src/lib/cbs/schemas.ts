import { z } from "zod";

// Raw CBS API responses (version=3.0), from the fixtures in tests/fixtures/cbs. Only the fields the app uses;
// the rest are dropped. CBS mixes numbers and numeric strings, so both are accepted.

const id = z.union([z.string(), z.number()]).transform(String);
const num = z.union([z.number(), z.string()]).transform((v) => Number(v)).pipe(z.number());
const flag = z.union([z.number(), z.string(), z.boolean()]).transform((v) => v === true || v === 1 || v === "1");
const optionalText = z.string().nullish().transform((v) => v?.trim() || null);

const envelope = <T extends z.ZodType>(body: T) => z.object({ body });

export const leagueDetailsResponse = envelope(
  z.object({
    league_details: z.object({
      name: z.string(),
      current_period: num,
      regular_season_periods: num,
      is_ppr: flag.optional(),
    }),
  }),
);

export const leagueTeamsResponse = envelope(
  z.object({
    teams: z.array(
      z.object({
        id,
        name: z.string(),
        abbr: z.string().default(""),
        logo: optionalText,
        logged_in_team: flag.optional(),
        owners: z.array(z.object({ name: z.string().optional() })).default([]),
      }),
    ),
  }),
);

const rosterPlayer = z.object({
  id,
  fullname: z.string(),
  position: z.string().default(""),
  roster_pos: z.string().default(""),
  // "A" is active (starting); "RS" is the reserve bench; others (e.g. "I" for IR) aren't starting.
  roster_status: z.string().default(""),
  pro_team: z.string().default(""),
  bye_week: num.nullish(),
  injury: optionalText,
  icons: z.object({ injury: z.string().optional() }).nullish(),
  opponent: optionalText,
  opponents: z.array(z.object({ abbrev: z.string().nullish() })).nullish(),
  projected_points: num.nullish(),
  photo: optionalText,
});

export const leagueRostersResponse = envelope(
  z.object({
    rosters: z.object({
      period: num,
      teams: z.array(
        z.object({
          id,
          name: z.string(),
          projected_points: num.nullish(),
          players: z.array(rosterPlayer).default([]),
        }),
      ),
    }),
  }),
);

export const leagueStandingsResponse = envelope(
  z.object({
    overall_standings: z.object({
      teams: z.array(
        z.object({
          id,
          name: z.string(),
          logo: optionalText,
          order: num,
          wins: num,
          losses: num,
          ties: num,
          winning_pct: num,
          points_scored: num,
          points_against: num,
          streak: z.string().default(""),
        }),
      ),
    }),
  }),
);

export const liveScoringResponse = envelope(
  z.object({
    live_scoring: z.object({
      period: num,
      matchup_status: z.string().default(""),
      my_team_id: id.nullish(),
      teams: z.array(
        z.object({
          id,
          name: z.string(),
          logo: optionalText,
          pts: num,
          ytp: num.nullish(),
          record: z.string().default(""),
          opp_team_id: id.nullish(),
        }),
      ),
    }),
  }),
);

// players/rankings?position=X: CBS's ranking at one position, owned and unowned. Owned players carry owned_by_team_id.
export const playerRankingsResponse = envelope(
  z.object({
    rankings: z.object({
      positions: z
        .array(
          z.object({
            players: z
              .array(
                z.object({
                  id,
                  fullname: z.string(),
                  position: z.string().default(""),
                  pro_team: z.string().default(""),
                  rank: num,
                  bye_week: num.nullish(),
                  owned_by_team_id: id.nullish(),
                  on_waivers: flag.optional(),
                  pro_status: z.string().default(""),
                  icons: z.object({ injury: z.string().optional() }).nullish(),
                  opponent: optionalText,
                  photo: optionalText,
                }),
              )
              .default([]),
          }),
        )
        .default([]),
    }),
  }),
);

export type LeagueDetailsResponse = z.infer<typeof leagueDetailsResponse>;
export type LeagueTeamsResponse = z.infer<typeof leagueTeamsResponse>;
export type LeagueRostersResponse = z.infer<typeof leagueRostersResponse>;
export type LeagueStandingsResponse = z.infer<typeof leagueStandingsResponse>;
export type LiveScoringResponse = z.infer<typeof liveScoringResponse>;
export type PlayerRankingsResponse = z.infer<typeof playerRankingsResponse>;

// Scoring rules. Every field can be missing or null; points are numeric strings.
const looseNum = z.union([z.number(), z.string()]).nullish().transform((v) => (v === null || v === undefined || v === "" ? null : Number(v)));
const looseBound = z.union([z.number(), z.string()]).nullish().transform((v) => (v === null || v === undefined ? null : String(v)));
const scoringRule = z.object({
  name: z.string(),
  pos: z.string().optional(),
  group: z.string().optional(),
  points: looseNum.optional(),
  bonuses: z.array(z.object({ from: looseBound, to: looseBound, points: looseNum })).default([]),
  ranges: z.array(z.object({ from: looseBound, to: looseBound, points: looseNum, per: looseNum.optional() })).default([]),
});
export type ScoringRuleRaw = z.infer<typeof scoringRule>;

export const leagueScoringRulesResponse = envelope(
  z.object({
    scoring_rules: z.object({ categories: z.array(scoringRule).default([]), positions: z.array(scoringRule).default([]) }),
  }),
);
export type LeagueScoringRulesResponse = z.infer<typeof leagueScoringRulesResponse>;

export const leagueScoringCategoriesResponse = envelope(
  z.object({
    categories: z.object({
      groups: z.array(z.object({ cats: z.array(z.object({ abbr: z.string(), desc: z.string().optional() })).default([]) })).default([]),
    }),
  }),
);
export type LeagueScoringCategoriesResponse = z.infer<typeof leagueScoringCategoriesResponse>;

export const leagueRulesResponse = envelope(
  z.object({
    rules: z.object({
      roster: z
        .object({ positions: z.array(z.object({ abbr: z.string(), max_active: looseNum })).default([]) })
        .optional(),
    }),
  }),
);
export type LeagueRulesResponse = z.infer<typeof leagueRulesResponse>;
