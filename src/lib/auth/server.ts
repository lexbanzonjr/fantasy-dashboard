import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { SESSION_COOKIE, verifySession, type Credentials } from "./session";

// The login from .env, or null when AUTH_USERNAME or AUTH_PASSWORD isn't set.
export function credentials(): Credentials | null {
  const e = env();
  if (!e.authUsername || !e.authPassword) return null;
  return { username: e.authUsername, password: e.authPassword, sessionSecret: e.sessionSecret };
}

export const MISSING_LOGIN = "Set AUTH_USERNAME and AUTH_PASSWORD in .env (see .env.example), then restart.";

export async function isSignedIn() {
  // Read the cookie first, even without a login set. That's what marks a page as per-request: the
  // Docker build runs without .env, and an early return here would let Next prerender every page as a
  // static redirect to /login, which loops with the login page once you're signed in.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  const creds = credentials();
  return !!creds && verifySession(creds, session);
}

// For route handlers: null when signed in, else the 401 to return. The proxy checks first; this makes
// sure each handler is safe on its own (Next advises against relying on the proxy alone).
export async function apiGuard(): Promise<Response | null> {
  if (await isSignedIn()) return null;
  return Response.json({ error: credentials() ? "Sign in first" : MISSING_LOGIN }, { status: 401 });
}

// For pages and server actions: sends a signed-out visitor to the login page.
export async function requireSignIn() {
  if (!(await isSignedIn())) redirect("/login");
}
