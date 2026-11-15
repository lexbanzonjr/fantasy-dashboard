import type { Metadata } from "next";
import Link from "next/link";
import { requireSignIn } from "@/lib/auth/server";
import { CbsAuthError } from "@/lib/cbs/client";
import { getCbsContext, getTeams } from "@/lib/cbs/queries";
import { ConnectBanner } from "@/components/connect-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Teams · Fantasy Dashboard" };

export default async function TeamsPage() {
  await requireSignIn();
  const cbs = await getCbsContext();
  if (cbs.status !== "connected") return null;

  let teams;
  try {
    teams = await getTeams(cbs.auth);
  } catch (err) {
    if (err instanceof CbsAuthError) return <ConnectBanner reconnect />;
    throw err;
  }
  const myTeamId = cbs.connection.myTeamId;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t.name}
                  {t.id === myTeamId && <Badge variant="secondary">You</Badge>}
                </CardTitle>
                <CardDescription>{t.owners.join(", ") || "No owner"}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{t.abbr}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
