import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { cbsFetch, CbsAuthError, CbsError, cbsUrl } from "@/lib/cbs/client";

const auth = { token: "tok+en/=", leagueId: "myleague" };
const schema = z.object({ body: z.object({ ok: z.boolean() }) });

function mockFetch(status: number, body: string) {
  const fn = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("cbsUrl", () => {
  it("builds the query string with version, format, league and token", () => {
    // Act
    const url = cbsUrl("/league/rosters", auth, { team_id: "15" });

    // Assert
    expect(url.origin + url.pathname).toBe("https://api.cbssports.com/fantasy/league/rosters");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      version: "3.0",
      response_format: "json",
      league_id: "myleague",
      access_token: "tok+en/=",
      team_id: "15",
    });
  });
});

describe("cbsFetch", () => {
  it("parses a good response", async () => {
    // Arrange
    mockFetch(200, JSON.stringify({ body: { ok: true }, extra: 1 }));

    // Act
    const result = await cbsFetch(schema, "league/details", auth);

    // Assert
    expect(result).toEqual({ body: { ok: true } });
  });

  it("skips the cache when revalidate isn't set", async () => {
    // Arrange
    const fn = mockFetch(200, JSON.stringify({ body: { ok: true } }));

    // Act
    await cbsFetch(schema, "a", auth);

    // Assert
    expect((fn.mock.calls[0] as unknown[])[1]).toEqual({ cache: "no-store" });
  });

  it("passes revalidate through to Next's fetch cache", async () => {
    // Arrange
    const fn = mockFetch(200, JSON.stringify({ body: { ok: true } }));

    // Act
    await cbsFetch(schema, "b", auth, {}, { revalidate: 300 });

    // Assert
    expect((fn.mock.calls[0] as unknown[])[1]).toEqual({ next: { revalidate: 300 } });
  });

  it.each([
    ["CBS's invalid-token response", 400, "Failed Authentication: error - invalid access token "],
    ["a 401", 401, ""],
  ])("throws CbsAuthError on %s", async (_label, status, body) => {
    // Arrange
    mockFetch(status, body);

    // Act & Assert
    await expect(cbsFetch(schema, "league/details", auth)).rejects.toBeInstanceOf(CbsAuthError);
  });

  it("throws CbsError on a 5xx", async () => {
    // Arrange
    mockFetch(503, "Service Unavailable");

    // Act
    const err = await cbsFetch(schema, "league/details", auth).catch((e) => e);

    // Assert
    expect(err).toBeInstanceOf(CbsError);
    expect(err).not.toBeInstanceOf(CbsAuthError);
    expect(err.message).toContain("503");
  });

  it.each([
    ["non-JSON", "<html>", /wasn't JSON/],
    ["an unexpected shape", JSON.stringify({ body: { ok: "yes" } }), /unexpected response shape/],
  ])("throws CbsError on %s", async (_label, body, message) => {
    // Arrange
    mockFetch(200, body);

    // Act & Assert
    await expect(cbsFetch(schema, "x", auth)).rejects.toThrow(message);
  });

  it("throws CbsError on a network failure", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));

    // Act & Assert
    await expect(cbsFetch(schema, "x", auth)).rejects.toThrow(/network error/);
  });
});
