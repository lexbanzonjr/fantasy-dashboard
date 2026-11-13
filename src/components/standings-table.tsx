import Link from "next/link";
import type { StandingRow } from "@/lib/cbs/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// The full table, or a compact one (rank, team, record, PF) for the dashboard.
export function StandingsTable({
  rows,
  myTeamId,
  compact = false,
}: {
  rows: StandingRow[];
  myTeamId: string | null;
  compact?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">W-L-T</TableHead>
          {!compact && <TableHead className="text-right">Pct</TableHead>}
          <TableHead className="text-right">PF</TableHead>
          {!compact && <TableHead className="text-right">PA</TableHead>}
          {!compact && <TableHead className="text-right">Streak</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.teamId} className={cn(r.teamId === myTeamId && "bg-primary/5 font-medium")}>
            <TableCell className="tabular-nums">{r.rank}</TableCell>
            <TableCell>
              <Link href={`/teams/${r.teamId}`} className="hover:underline">
                {r.name}
              </Link>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.wins}-{r.losses}-{r.ties}
            </TableCell>
            {!compact && <TableCell className="text-right tabular-nums">{r.winPct.toFixed(3)}</TableCell>}
            <TableCell className="text-right tabular-nums">{r.pointsFor.toFixed(1)}</TableCell>
            {!compact && <TableCell className="text-right tabular-nums">{r.pointsAgainst.toFixed(1)}</TableCell>}
            {!compact && <TableCell className="text-right">{r.streak}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
