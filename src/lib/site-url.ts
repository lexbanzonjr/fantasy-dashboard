import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

const FALLBACK = "http://localhost:6972";

const first = (value: string | null) => value?.split(",")[0]?.trim() || null;

// The app's public URL: NEXT_PUBLIC_SITE_URL when set, else the host the request came in on.
export function siteUrlFrom(override: string | null, h: Pick<Headers, "get">): string {
  if (override) return override.replace(/\/+$/, "");
  const host = first(h.get("x-forwarded-host")) ?? first(h.get("host"));
  if (!host) return FALLBACK;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const proto = first(h.get("x-forwarded-proto")) ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}

export async function resolveSiteUrl(): Promise<string> {
  return siteUrlFrom(env().siteUrl, await headers());
}
