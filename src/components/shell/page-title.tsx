"use client";

import { usePathname } from "next/navigation";
import { NAV, within } from "./nav";

export function PageTitle() {
  const pathname = usePathname();
  const item = NAV.find((n) => within(pathname, n.href));
  return <span className="text-sm font-medium text-muted-foreground">{item?.label ?? ""}</span>;
}
