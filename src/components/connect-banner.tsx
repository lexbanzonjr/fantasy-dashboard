import Link from "next/link";

// Shown when there's no CBS connection, or when CBS rejects the saved token.
export function ConnectBanner({ reconnect = false }: { reconnect?: boolean }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <span>
        {reconnect
          ? "CBS stopped accepting the saved token. It probably expired."
          : "Connect your CBS league to see your team."}
      </span>
      <Link href="/settings" className="font-medium underline underline-offset-4">
        {reconnect ? "Reconnect CBS" : "Connect CBS"}
      </Link>
    </div>
  );
}
