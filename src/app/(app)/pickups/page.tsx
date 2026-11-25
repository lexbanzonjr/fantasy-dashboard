import { requireSignIn } from "@/lib/auth/server";
import { getModel } from "@/lib/ai/model";
import { toPickupRows, type PickupRow, type PickupTrace } from "@/lib/ai/pickups";
import { getCachedReports } from "@/lib/ai/reports";
import { CbsAuthError } from "@/lib/cbs/client";
import { getCbsContext, getFreeAgents, getLeague, getRoster } from "@/lib/cbs/queries";
import { PICKUP_POSITIONS, type PickupPosition } from "@/lib/cbs/types";
import { ConnectBanner } from "@/components/connect-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PickupControls } from "./controls";

const VERDICT = { add: "default", watch: "secondary", pass: "outline" } as const;

export default async function PickupsPage({ searchParams }: PageProps<"/pickups">) {
  await requireSignIn();
  const raw = (await searchParams).position;
  const position: PickupPosition = PICKUP_POSITIONS.find((p) => p === raw) ?? "RB";
  const cbs = await getCbsContext();
  if (cbs.status !== "connected") return null;
  const myTeamId = cbs.connection.myTeamId;
  if (!myTeamId) return <p className="text-sm text-muted-foreground">Your CBS team isn&apos;t known. Reconnect in Settings.</p>;

  let data;
  try {
    data = await Promise.all([getLeague(cbs.auth), getRoster(cbs.auth, myTeamId), getFreeAgents(cbs.auth, position)]);
  } catch (err) {
    if (err instanceof CbsAuthError) return <ConnectBanner reconnect />;
    throw err;
  }
  const [league, roster, agents] = data;
  const cached = await getCachedReports(position, league.currentPeriod);
  const rows = toPickupRows(agents, cached, roster?.players ?? []);
  const aiEnabled = getModel() !== null;
  const lastRun = cached.map((c) => c.createdAt).sort().at(-1);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recommended pickups</h1>
          <p className="text-sm text-muted-foreground">
            Week {league.currentPeriod} · top {agents.length} free agents at {position}
            {lastRun && ` · researched ${new Date(lastRun).toLocaleString()}`}
          </p>
        </div>
        <PickupControls position={position} hasReports={cached.length > 0} enabled={aiEnabled} />
      </div>
      {!aiEnabled && <p className="text-sm text-muted-foreground">Set ANTHROPIC_API_KEY to turn on research.</p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">CBS has no free agents at {position}.</p>}
      {rows.map((row) => (
        <PickupCard key={row.agent.id} row={row} />
      ))}
    </div>
  );
}

// The prompt Claude got, then what it thought, searched for and noted, in order. Plain text only.
function TraceDetails({ trace }: { trace: PickupTrace }) {
  return (
    <details className="rounded-md border px-3 py-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">How the AI decided</summary>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-1">
          <p className="font-medium">Prompt</p>
          <pre className="whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono">{trace.prompt}</pre>
        </div>
        {trace.steps.length > 0 ? (
          <ol className="grid gap-2">
            {trace.steps.map((step, i) => (
              <li key={i} className={step.kind === "search" ? "font-medium" : "whitespace-pre-wrap text-muted-foreground"}>
                {step.kind === "search" ? `🔍 Searched: ${step.text}` : step.kind === "thinking" ? `💭 ${step.text}` : step.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">No thinking or searches were returned.</p>
        )}
      </div>
    </details>
  );
}

function PickupCard({ row: { agent, report, trace, drop } }: { row: PickupRow }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{agent.name}</CardTitle>
            <CardDescription>
              {agent.position} · {agent.proTeam} · CBS rank {agent.rank}
              {agent.opponent && ` · ${agent.opponent}`}
              {agent.onWaivers && " · on waivers"}
              {agent.injury && ` · ${agent.injury}`}
            </CardDescription>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              <Badge variant={VERDICT[report.verdict]}>{report.verdict}</Badge>
              <span className="text-2xl font-semibold tabular-nums" aria-label="Score">
                {report.score}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {report ? (
          <>
            <p>{report.newsSummary}</p>
            {report.sources.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {report.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-muted-foreground underline hover:text-foreground">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground">
              {drop ? (
                <>
                  Drop <span className="font-medium text-foreground">{drop.name}</span>: {report.dropReason}
                </>
              ) : (
                "No drop suggested."
              )}
            </p>
            {trace && <TraceDetails trace={trace} />}
          </>
        ) : (
          <p className="text-muted-foreground">Not researched yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
