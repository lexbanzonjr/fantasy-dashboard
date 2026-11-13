import { z } from "zod";

// Raw CBS API responses (version=3.0), from the fixtures in __fixtures__. Only the fields the app uses;
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

export type LeagueDetailsResponse = z.infer<typeof leagueDetailsResponse>;
export type LeagueTeamsResponse = z.infer<typeof leagueTeamsResponse>;
export type LeagueRostersResponse = z.infer<typeof leagueRostersResponse>;
export type LeagueStandingsResponse = z.infer<typeof leagueStandingsResponse>;
export type LiveScoringResponse = z.infer<typeof liveScoringResponse>;
