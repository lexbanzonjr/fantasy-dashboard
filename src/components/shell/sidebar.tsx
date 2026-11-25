import Link from "next/link";
import { NavLinks } from "./nav";
import { Wordmark } from "./wordmark";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
      <Link href="/" className="px-3">
        <Wordmark />
      </Link>
      <NavLinks />
    </aside>
  );
}
