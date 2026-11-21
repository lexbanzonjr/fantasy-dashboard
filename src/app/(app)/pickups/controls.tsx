"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PICKUP_POSITIONS } from "@/lib/cbs/types";
import { runResearch } from "./actions";

export function PickupControls({ position, hasReports, enabled }: { position: string; hasReports: boolean; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const research = () =>
    start(async () => {
      const res = await runResearch(position);
      if (!res.ok) return void toast.error(res.error);
      if (res.failed.length) toast.warning(`Researched ${res.researched}; failed: ${res.failed.join(", ")}`);
      else toast.success(`Researched ${res.researched} players.`);
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={position} onValueChange={(v) => v && router.push(`/pickups?position=${v}`)} disabled={pending}>
        <SelectTrigger aria-label="Position">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PICKUP_POSITIONS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={research} disabled={pending || !enabled}>
        {pending ? "Researching… (about a minute)" : hasReports ? "Refresh research" : "Run research"}
      </Button>
    </div>
  );
}
