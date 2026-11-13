import { describe, expect, it } from "vitest";
import { bookmarkletSource, extractToken, parseConnectHash } from "./bookmarklet";

describe("parseConnectHash", () => {
  it("reads the token and league", () => {
    expect(parseConnectHash("#token=abc&league=myleague")).toEqual({ token: "abc", leagueId: "myleague" });
  });

  it("decodes URL-encoded values and lowercases the league", () => {
    expect(parseConnectHash("#token=U2Fs%2B%2Fx%3D%3D&league=MyLeague")).toEqual({ token: "U2Fs+/x==", leagueId: "myleague" });
  });

  it("needs both values", () => {
    expect(parseConnectHash("")).toBeNull();
    expect(parseConnectHash("#token=abc")).toBeNull();
    expect(parseConnectHash("#league=x&token=")).toBeNull();
  });
});

describe("extractToken", () => {
  it("finds the CBSi.token assignment in a league page", () => {
    const html = `<script>CBSi={};CBSi.namespace=function(){};\n    CBSi.token = "U2FsdGVkX1+tok/en==";</script>`;
    expect(extractToken(html)).toBe("U2FsdGVkX1+tok/en==");
    expect(extractToken("<html>no token</html>")).toBeNull();
  });
});

describe("bookmarkletSource", () => {
  const src = bookmarkletSource("http://localhost:6972/");
  const code = decodeURIComponent(src.replace(/^javascript:/, ""));

  it("is a javascript: URL that opens Settings with the values in the fragment", () => {
    expect(src.startsWith("javascript:")).toBe(true);
    expect(code).toContain('"http://localhost:6972/settings"+"#token="');
    expect(code).toContain("CBSi.token");
  });

  it("runs against a CBS page and opens the right URL", () => {
    const opened: string[] = [];
    const window = { CBSi: { token: "U2Fs+/x==" }, open: (url: string) => opened.push(url) };
    const document = { documentElement: { innerHTML: "" } };
    const location = { hostname: "myleague.football.cbssports.com" };
    new Function("window", "document", "location", "alert", code)(window, document, location, () => {});
    expect(opened).toHaveLength(1);
    expect(parseConnectHash(new URL(opened[0]!).hash)).toEqual({ token: "U2Fs+/x==", leagueId: "myleague" });
  });

  it("falls back to the page HTML, and refuses non-CBS pages", () => {
    const opened: string[] = [];
    const alerts: string[] = [];
    const run = (hostname: string) =>
      new Function("window", "document", "location", "alert", code)(
        { open: (url: string) => opened.push(url) },
        { documentElement: { innerHTML: 'CBSi.token = "fromhtml";' } },
        { hostname },
        (m: string) => alerts.push(m),
      );
    run("myleague.football.cbssports.com");
    expect(parseConnectHash(new URL(opened[0]!).hash)?.token).toBe("fromhtml");
    run("example.com");
    expect(opened).toHaveLength(1);
    expect(alerts).toHaveLength(1);
  });
});
