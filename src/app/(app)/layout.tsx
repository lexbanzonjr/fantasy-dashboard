import { credentials, requireSignIn } from "@/lib/auth/server";
import { getCbsContext } from "@/lib/cbs/queries";
import { ConnectBanner } from "@/components/connect-banner";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSignIn();
  const cbs = await getCbsContext();
  return (
    <div className="flex min-h-dvh bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar username={credentials()?.username ?? ""} />
        <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-8">
          {cbs.status === "disconnected" && <ConnectBanner />}
          {cbs.status === "broken" && <ConnectBanner reconnect />}
          {children}
        </main>
      </div>
    </div>
  );
}
