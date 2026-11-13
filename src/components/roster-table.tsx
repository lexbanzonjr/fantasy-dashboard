import type { RosterPlayer } from "@/lib/cbs/types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmt(n: number | null) {
  return n === null ? "—" : n.toFixed(1);
}

function PlayerRows({ players, period }: { players: RosterPlayer[]; period: number }) {
  return players.map((p) => {
    const onBye = p.opponent === "BYE" || p.byeWeek === period;
    return (
      <TableRow key={p.id}>
        <TableCell className="w-20 font-mono text-xs text-muted-foreground">{p.slot || p.position}</TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">
              {p.position} · {p.proTeam}
            </span>
            {p.injury && (
              <Badge variant="destructive" title={p.injury}>
                {p.injury.split(":")[0]}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{onBye ? <Badge variant="secondary">BYE</Badge> : (p.opponent ?? "—")}</TableCell>
        <TableCell className="text-right tabular-nums">{fmt(p.projectedPoints)}</TableCell>
      </TableRow>
    );
  });
}

export function RosterTable({ players, period }: { players: RosterPlayer[]; period: number }) {
  const starters = players.filter((p) => p.isStarter);
  const bench = players.filter((p) => !p.isStarter);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Slot</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Opp</TableHead>
          <TableHead className="text-right">Proj</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <PlayerRows players={starters} period={period} />
        {bench.length > 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={4} className="pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bench
            </TableCell>
          </TableRow>
        )}
        <PlayerRows players={bench} period={period} />
      </TableBody>
    </Table>
  );
}
