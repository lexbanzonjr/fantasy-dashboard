import Link from "next/link";
import { requireSignIn } from "@/lib/auth/server";
import { CbsAuthError } from "@/lib/cbs/client";
import { getCbsContext, getMatchup, getRoster, getStandings } from "@/lib/cbs/queries";
import { ConnectBanner } from "@/components/connect-banner";
import { MatchupCard } from "@/components/matchup-card";
import { RosterTable } from "@/components/roster-table";
import { StandingsTable } from "@/components/standings-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  await requireSignIn();
  const cbs = getCbsContext();
  // The layout shows the connect banner.
  if (cbs.status !== "connected") return null;

  const myTeamId = cbs.connection.myTeamId;
  if (!myTeamId) {
    return (
      <p className="text-sm">
        Pick your team in <Link href="/settings" className="underline underline-offset-4">Settings</Link> to see your
        roster and matchup.
      </p>
    );
  }

  let data;
  try {
    data = await Promise.all([getMatchup(cbs.auth, myTeamId), getRoster(cbs.auth, myTeamId), getStandings(cbs.auth)]);
  } catch (err) {
    if (err instanceof CbsAuthError) return <ConnectBanner reconnect />;
    throw err;
  }
  const [matchup, roster, standings] = data;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-6">
        <MatchupCard matchup={matchup} projected={roster?.projectedPoints ?? null} />
        <Card>
          <CardHeader>
            <CardTitle>{roster?.teamName ?? "My roster"}</CardTitle>
          </CardHeader>
          <CardContent>
            {roster ? (
              <RosterTable players={roster.players} period={roster.period} />
            ) : (
              <p className="text-sm text-muted-foreground">CBS didn&apos;t return a roster for your team.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="content-start">
        <CardHeader>
          <CardTitle>
            <Link href="/standings" className="hover:underline">
              Standings
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StandingsTable rows={standings} myTeamId={myTeamId} compact />
        </CardContent>
      </Card>
    </div>
  );
}
