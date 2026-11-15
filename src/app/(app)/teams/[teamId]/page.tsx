import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSignIn } from "@/lib/auth/server";
import { CbsAuthError } from "@/lib/cbs/client";
import { getCbsContext, getRoster, getTeams } from "@/lib/cbs/queries";
import { ConnectBanner } from "@/components/connect-banner";
import { RosterTable } from "@/components/roster-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeamPage({ params }: PageProps<"/teams/[teamId]">) {
  await requireSignIn();
  const { teamId } = await params;
  const cbs = await getCbsContext();
  if (cbs.status !== "connected") return null;

  let data;
  try {
    data = await Promise.all([getTeams(cbs.auth), getRoster(cbs.auth, teamId)]);
  } catch (err) {
    if (err instanceof CbsAuthError) return <ConnectBanner reconnect />;
    throw err;
  }
  const [teams, roster] = data;
  const team = teams.find((t) => t.id === teamId);
  if (!team) notFound();

  return (
    <div className="grid gap-4">
      <Link href="/teams" className="text-sm text-muted-foreground hover:text-foreground">
        ← Teams
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{team.name}</CardTitle>
          <CardDescription>
            {team.owners.join(", ") || "No owner"}
            {roster?.projectedPoints != null && ` · projected ${roster.projectedPoints.toFixed(1)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roster ? (
            <RosterTable players={roster.players} period={roster.period} />
          ) : (
            <p className="text-sm text-muted-foreground">CBS didn&apos;t return a roster for this team.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
