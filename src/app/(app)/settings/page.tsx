import type { Metadata } from "next";
import { requireSignIn } from "@/lib/auth/server";
import { bookmarkletSource } from "@/lib/cbs/bookmarklet";
import { getCbsContext } from "@/lib/cbs/queries";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectCbs } from "./actions";
import { BookmarkletLink } from "./bookmarklet-link";
import { ConnectForm } from "./connect-form";

export const metadata: Metadata = { title: "Settings · Fantasy Dashboard" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "never");

export default async function SettingsPage() {
  await requireSignIn();
  const cbs = getCbsContext();
  const connection = cbs.status === "disconnected" ? null : cbs.connection;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>CBS connection</CardTitle>
          <CardDescription>
            {connection ? (
              <>
                {connection.leagueName ?? connection.leagueId} · team {connection.myTeamId ?? "not picked"} · token checked{" "}
                {when(connection.lastVerifiedAt)}
              </>
            ) : (
              "Not connected."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {cbs.status === "broken" && (
            <p role="alert" className="text-sm text-destructive">
              The saved token can&apos;t be read (CBS_TOKEN_KEY may have changed). Connect again below.
            </p>
          )}
          <ol className="grid list-decimal gap-2 pl-5 text-sm">
            <li>
              Drag this to your bookmarks bar: <BookmarkletLink source={bookmarkletSource(env().siteUrl)} />
            </li>
            <li>Open your CBS league page while signed in to CBS.</li>
            <li>Click the bookmark. This page opens with the league and token filled in. Save.</li>
          </ol>
          <ConnectForm leagueId={connection?.leagueId ?? null} />
          {connection && (
            <form action={disconnectCbs}>
              <Button type="submit" variant="destructive">
                Disconnect
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
