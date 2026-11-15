import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { requireSignIn } from "@/lib/auth/server";
import { getCbsContext } from "@/lib/cbs/queries";
import { ConnectBanner } from "@/components/connect-banner";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/standings", label: "Standings" },
  { href: "/settings", label: "Settings" },
] as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSignIn();
  const cbs = await getCbsContext();
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Fantasy Dashboard
          </Link>
          <nav className="flex flex-1 gap-4 text-sm text-muted-foreground">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6">
        {cbs.status === "disconnected" && <ConnectBanner />}
        {cbs.status === "broken" && <ConnectBanner reconnect />}
        {children}
      </main>
    </>
  );
}
