"use server";

import { revalidatePath } from "next/cache";
import { requireSignIn } from "@/lib/auth/server";
import { cbsFetch, CbsAuthError } from "@/lib/cbs/client";
import { deleteConnection, saveConnection, setMyTeam } from "@/lib/cbs/connection";
import { myTeamId, toLeague, toTeams } from "@/lib/cbs/mappers";
import { leagueDetailsResponse, leagueTeamsResponse } from "@/lib/cbs/schemas";

export interface ConnectState {
  status: "idle" | "error" | "saved" | "pick-team";
  message: string | null;
  teams?: { id: string; name: string }[];
}

export async function saveCbsConnection(_prev: ConnectState, form: FormData): Promise<ConnectState> {
  await requireSignIn();
  const token = String(form.get("token") ?? "").trim();
  const leagueId = String(form.get("leagueId") ?? "").trim().toLowerCase();
  if (!token || !leagueId) return { status: "error", message: "Enter both the league id and the token." };
  if (!/^[a-z0-9-]+$/.test(leagueId)) {
    return { status: "error", message: 'The league id is the first part of the CBS address, e.g. "myleague".' };
  }

  // Checks the token against CBS before saving it.
  const auth = { token, leagueId };
  let league, teams;
  try {
    [league, teams] = await Promise.all([
      cbsFetch(leagueDetailsResponse, "league/details", auth).then((r) => toLeague(leagueId, r)),
      cbsFetch(leagueTeamsResponse, "league/teams", auth).then(toTeams),
    ]);
  } catch (err) {
    if (err instanceof CbsAuthError) {
      return { status: "error", message: "CBS rejected that token. Run the bookmarklet again on your league page." };
    }
    return { status: "error", message: `Couldn't reach CBS: ${(err as Error).message}` };
  }

  const mine = myTeamId(teams);
  try {
    await saveConnection({ leagueId, leagueName: league.name, myTeamId: mine, token });
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
  revalidatePath("/", "layout");
  if (!mine) {
    return {
      status: "pick-team",
      message: `Connected to ${league.name}. CBS didn't say which team is yours, so pick it below.`,
      teams: teams.map((t) => ({ id: t.id, name: t.name })),
    };
  }
  const myName = teams.find((t) => t.id === mine)?.name ?? mine;
  return { status: "saved", message: `Connected to ${league.name} as ${myName}.` };
}

export async function chooseMyTeam(form: FormData) {
  await requireSignIn();
  const teamId = String(form.get("teamId") ?? "").trim();
  if (teamId) await setMyTeam(teamId);
  revalidatePath("/", "layout");
}

export async function disconnectCbs() {
  await requireSignIn();
  await deleteConnection();
  revalidatePath("/", "layout");
}
