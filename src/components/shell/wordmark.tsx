import { Trophy } from "lucide-react";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Trophy className="size-4" aria-hidden />
      </span>
      Fantasy Dashboard
    </span>
  );
}
