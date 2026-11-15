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
    // Arrange
    const req = request("/teams?sort=name");

    // Act
    const res = proxy(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:6972/login?next=%2Fteams%3Fsort%3Dname");
  });

  it("sends a signed-out visit to / to the login page without a next param", () => {
    // Arrange
    const req = request("/");

    // Act
    const res = proxy(req);

    // Assert
    expect(res.headers.get("location")).toBe("http://localhost:6972/login");
  });

  it("answers signed-out API calls with 401", async () => {
    // Arrange
    const req = request("/api/scan");

    // Act
    const res = proxy(req);

    // Assert
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in first" });
  });

  it.each([["/api/scan"], ["/teams"]])("lets a valid session through to %s", (path) => {
    // Arrange
    const req = request(path, createSession(creds).value);

    // Act
    const res = proxy(req);

    // Assert
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects a forged session", () => {
    // Arrange
    const req = request("/api/scan", "9999999999999.forged");

    // Act
    const res = proxy(req);

    // Assert
    expect(res.status).toBe(401);
  });

  it("says how to set a login when there isn't one", async () => {
    // Arrange
    g.__fantasyDashboardEnv = parseEnv({});
    const req = request("/api/scan", createSession(creds).value);

    // Act
    const res = proxy(req);

    // Assert
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/AUTH_USERNAME/);
  });
});

describe("proxy config.matcher", () => {
  const [pattern] = config.matcher;

  it.each([
    ["/login", false],
    ["/_next/static/chunks/main.js", false],
    ["/favicon.ico", false],
    ["/teams", true],
    ["/api/scan", true],
  ])("matches %s: %s", (path, expected) => {
    // Arrange
    const matcher = new RegExp(`^${pattern}$`);

    // Act
    const result = matcher.test(path);

    // Assert
    expect(result).toBe(expected);
  });
});
