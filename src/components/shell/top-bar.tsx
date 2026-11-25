import { MobileNav } from "./mobile-nav";
import { PageTitle } from "./page-title";
import { UserMenu } from "./user-menu";

export function TopBar({ username }: { username: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
      <MobileNav />
      <PageTitle />
      <div className="ml-auto flex items-center gap-2">
        <UserMenu username={username} />
      </div>
    </header>
  );
}
