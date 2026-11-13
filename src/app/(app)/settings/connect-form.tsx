"use client";

import { useActionState, useEffect, useState } from "react";
import { parseConnectHash } from "@/lib/cbs/bookmarklet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chooseMyTeam, saveCbsConnection, type ConnectState } from "./actions";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ConnectForm({ leagueId }: { leagueId: string | null }) {
  const [state, action, pending] = useActionState<ConnectState, FormData>(saveCbsConnection, { status: "idle", message: null });
  const [values, setValues] = useState({ leagueId: leagueId ?? "", token: "" });
  const [fromBookmarklet, setFromBookmarklet] = useState(false);

  // Fills in what the bookmarklet passed, then drops it from the address bar and history.
  useEffect(() => {
    const parsed = parseConnectHash(window.location.hash);
    if (!parsed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
    setValues(parsed);
    setFromBookmarklet(true);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="leagueId">League id</Label>
          <Input
            id="leagueId"
            name="leagueId"
            placeholder="myleague"
            value={values.leagueId}
            onChange={(e) => setValues((v) => ({ ...v, leagueId: e.target.value }))}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="token">Access token</Label>
          <Input
            id="token"
            name="token"
            type="password"
            autoComplete="off"
            value={values.token}
            onChange={(e) => setValues((v) => ({ ...v, token: e.target.value }))}
            required
          />
          {fromBookmarklet && <p className="text-xs text-muted-foreground">Filled in from the bookmarklet.</p>}
        </div>
        {state.message && (
          <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm"}>
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Checking with CBS…" : "Save connection"}
        </Button>
      </form>

      {state.status === "pick-team" && state.teams && (
        <form action={chooseMyTeam} className="grid gap-2 rounded-lg border p-4">
          <Label htmlFor="teamId">Your team</Label>
          <select id="teamId" name="teamId" className={selectClass} required defaultValue="">
            <option value="" disabled>
              Pick your team
            </option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" className="justify-self-start">
            Save team
          </Button>
        </form>
      )}
    </div>
  );
}
