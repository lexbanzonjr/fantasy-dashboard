"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ListOrdered, Settings, UserPlus, Users } from "lucide-react";
import { cn } from "cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/standings", label: "Standings", icon: ListOrdered },
  { href: "/pickups", label: "Pickups", icon: UserPlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const within = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

const linkClass =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = within(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(linkClass, active && "bg-sidebar-accent text-sidebar-foreground [&_svg]:text-primary")}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
