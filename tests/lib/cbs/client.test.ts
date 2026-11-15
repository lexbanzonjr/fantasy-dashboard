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
    const url = cbsUrl("/league/rosters", auth, { team_id: "15" });
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
    mockFetch(200, JSON.stringify({ body: { ok: true }, extra: 1 }));
    await expect(cbsFetch(schema, "league/details", auth)).resolves.toEqual({ body: { ok: true } });
  });

  it("skips the cache unless revalidate is set", async () => {
    const fn = mockFetch(200, JSON.stringify({ body: { ok: true } }));
    await cbsFetch(schema, "a", auth);
    await cbsFetch(schema, "b", auth, {}, { revalidate: 300 });
    expect(fn.mock.calls.map((c) => (c as unknown[])[1])).toEqual([{ cache: "no-store" }, { next: { revalidate: 300 } }]);
  });

  it("throws CbsAuthError on CBS's invalid-token response", async () => {
    mockFetch(400, "Failed Authentication: error - invalid access token ");
    await expect(cbsFetch(schema, "league/details", auth)).rejects.toBeInstanceOf(CbsAuthError);
  });

  it("throws CbsAuthError on 401", async () => {
    mockFetch(401, "");
    await expect(cbsFetch(schema, "league/details", auth)).rejects.toBeInstanceOf(CbsAuthError);
  });

  it("throws CbsError on a 5xx", async () => {
    mockFetch(503, "Service Unavailable");
    const err = await cbsFetch(schema, "league/details", auth).catch((e) => e);
    expect(err).toBeInstanceOf(CbsError);
    expect(err).not.toBeInstanceOf(CbsAuthError);
    expect(err.message).toContain("503");
  });

  it("throws CbsError on non-JSON or an unexpected shape", async () => {
    mockFetch(200, "<html>");
    await expect(cbsFetch(schema, "x", auth)).rejects.toThrow(/wasn't JSON/);
    mockFetch(200, JSON.stringify({ body: { ok: "yes" } }));
    await expect(cbsFetch(schema, "x", auth)).rejects.toThrow(/unexpected response shape/);
  });

  it("throws CbsError on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(cbsFetch(schema, "x", auth)).rejects.toThrow(/network error/);
  });
});
