import type { Matchup, MatchupSide } from "@/lib/cbs/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Side({ side, align }: { side: MatchupSide; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="truncate font-medium">{side.name}</div>
      <div className="text-xs text-muted-foreground">
        {side.record}
        {side.yetToPlay !== null && ` · ${side.yetToPlay} yet to play`}
      </div>
      <div className="mt-2 text-4xl font-semibold tabular-nums">{side.points.toFixed(1)}</div>
    </div>
  );
}

export function MatchupCard({ matchup, projected }: { matchup: Matchup | null; projected: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{matchup ? `Week ${matchup.period} matchup` : "This week"}</CardTitle>
        <CardDescription>
          {matchup?.status ? `${matchup.status[0]!.toUpperCase()}${matchup.status.slice(1)}` : ""}
          {projected !== null && ` · your projection ${projected.toFixed(1)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!matchup ? (
          <p className="text-sm text-muted-foreground">No live scoring for your team right now.</p>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
            <Side side={matchup.mine} align="left" />
            <span className="pb-2 text-sm text-muted-foreground">vs</span>
            {matchup.opponent ? (
              <Side side={matchup.opponent} align="right" />
            ) : (
              <div className="text-right text-sm text-muted-foreground">Bye week</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
