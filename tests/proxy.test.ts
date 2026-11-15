import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { parseEnv, type Env } from "@/lib/env";
import { createSession } from "@/lib/auth/session";
import { config, proxy } from "@/proxy";

const g = globalThis as unknown as { __fantasyDashboardEnv?: Env };
const creds = { username: "tester", password: "pw", sessionSecret: null };

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:6972${path}`, { headers: cookie ? { cookie: `fd_session=${cookie}` } : {} });

beforeEach(() => {
  g.__fantasyDashboardEnv = parseEnv({ AUTH_USERNAME: "tester", AUTH_PASSWORD: "pw" });
});

afterEach(() => {
  g.__fantasyDashboardEnv = undefined;
});

describe("proxy", () => {
  it("sends signed-out page visits to the login page, remembering where they were going", () => {
    const res = proxy(request("/teams?sort=name"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:6972/login?next=%2Fteams%3Fsort%3Dname");
    expect(proxy(request("/")).headers.get("location")).toBe("http://localhost:6972/login");
  });

  it("answers signed-out API calls with 401", async () => {
    const res = proxy(request("/api/scan"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in first" });
  });

  it("lets a valid session through, and not a forged one", () => {
    const { value } = createSession(creds);
    expect(proxy(request("/api/scan", value)).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(request("/teams", value)).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(request("/api/scan", "9999999999999.forged")).status).toBe(401);
  });

  it("says how to set a login when there isn't one", async () => {
    g.__fantasyDashboardEnv = parseEnv({});
    const res = proxy(request("/api/scan", createSession(creds).value));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/AUTH_USERNAME/);
  });

  it("leaves the login page and Next's own files alone", () => {
    const [pattern] = config.matcher;
    const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);
    expect(matches("/login")).toBe(false);
    expect(matches("/_next/static/chunks/main.js")).toBe(false);
    expect(matches("/favicon.ico")).toBe(false);
    expect(matches("/teams")).toBe(true);
    expect(matches("/api/scan")).toBe(true);
  });
});
