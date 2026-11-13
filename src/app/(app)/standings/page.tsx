import type { Metadata } from "next";
import { requireSignIn } from "@/lib/auth/server";
import { CbsAuthError } from "@/lib/cbs/client";
import { getCbsContext, getStandings } from "@/lib/cbs/queries";
import { ConnectBanner } from "@/components/connect-banner";
import { StandingsTable } from "@/components/standings-table";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Standings · Fantasy Dashboard" };

export default async function StandingsPage() {
  await requireSignIn();
  const cbs = getCbsContext();
  if (cbs.status !== "connected") return null;

  let rows;
  try {
    rows = await getStandings(cbs.auth);
  } catch (err) {
    if (err instanceof CbsAuthError) return <ConnectBanner reconnect />;
    throw err;
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
      <Card>
        <CardContent>
          <StandingsTable rows={rows} myTeamId={cbs.connection.myTeamId} />
        </CardContent>
      </Card>
    </div>
  );
}
