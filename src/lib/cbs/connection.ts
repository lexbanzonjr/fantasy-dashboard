import "server-only";
import { db, now, one } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptToken, encryptToken } from "./crypto";

// The saved CBS connection (one row, id = 1).

export interface Connection {
  leagueId: string;
  leagueName: string | null;
  myTeamId: string | null;
  tokenCiphertext: string;
  tokenUpdatedAt: string | null;
  lastVerifiedAt: string | null;
}

interface Row {
  league_id: string;
  league_name: string | null;
  my_team_id: string | null;
  token_ciphertext: string;
  token_updated_at: string | null;
  last_verified_at: string | null;
}

export async function readConnection(): Promise<Connection | null> {
  const row = await one<Row>("SELECT * FROM cbs_connection WHERE id = 1");
  if (!row) return null;
  return {
    leagueId: row.league_id,
    leagueName: row.league_name,
    myTeamId: row.my_team_id,
    tokenCiphertext: row.token_ciphertext,
    tokenUpdatedAt: row.token_updated_at,
    lastVerifiedAt: row.last_verified_at,
  };
}

// The plain token, or null if it can't be decrypted (tampered, or CBS_TOKEN_KEY changed).
export function connectionToken(c: Connection): string | null {
  try {
    return decryptToken(c.tokenCiphertext, env().cbsTokenKey);
  } catch {
    return null;
  }
}

export async function saveConnection(input: { leagueId: string; leagueName: string; myTeamId: string | null; token: string }) {
  const t = now();
  await (await db()).execute({
    sql:
            `INSERT INTO cbs_connection (id, league_id, league_name, my_team_id, token_ciphertext, token_updated_at, last_verified_at, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         league_id = excluded.league_id, league_name = excluded.league_name, my_team_id = excluded.my_team_id,
         token_ciphertext = excluded.token_ciphertext, token_updated_at = excluded.token_updated_at,
         last_verified_at = excluded.last_verified_at, updated_at = excluded.updated_at`,
    args: [input.leagueId, input.leagueName, input.myTeamId, encryptToken(input.token, env().cbsTokenKey), t, t, t, t],
  });
}

export async function setMyTeam(teamId: string) {
  await (await db()).execute({ sql: "UPDATE cbs_connection SET my_team_id = ?, updated_at = ? WHERE id = 1", args: [teamId, now()] });
}

export async function deleteConnection() {
  await (await db()).execute("DELETE FROM cbs_connection WHERE id = 1");
}
