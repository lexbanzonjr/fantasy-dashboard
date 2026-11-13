"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="grid gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium">Couldn&apos;t load this page.</p>
      <p className="text-muted-foreground">{error.message || "Something went wrong talking to CBS."}</p>
      <Button variant="outline" size="sm" className="justify-self-start" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
