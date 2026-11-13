import { NextResponse, type NextRequest } from "next/server";
import { credentials, MISSING_LOGIN } from "@/lib/auth/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// Every page and API route needs the login, except the login page itself. Signed-out page visits go
// to /login and come back afterwards; API calls get a 401.
export function proxy(request: NextRequest) {
  const creds = credentials();
  if (creds && verifySession(creds, request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: creds ? "Sign in first" : MISSING_LOGIN }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page, Next's own files and the icon.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
