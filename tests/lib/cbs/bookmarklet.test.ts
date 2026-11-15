import { describe, expect, it } from "vitest";
import { bookmarkletSource, extractToken, parseConnectHash } from "@/lib/cbs/bookmarklet";

const CBS_HOST = "myleague.football.cbssports.com";

/** Runs the bookmarklet's code against fake browser globals and records what it did. */
function runBookmarklet(code: string, { hostname, cbsiToken, html = "" }: { hostname: string; cbsiToken?: string; html?: string }) {
  const opened: string[] = [];
  const alerts: string[] = [];
  const window = { ...(cbsiToken ? { CBSi: { token: cbsiToken } } : {}), open: (url: string) => opened.push(url) };
  const document = { documentElement: { innerHTML: html } };
  new Function("window", "document", "location", "alert", code)(window, document, { hostname }, (m: string) => alerts.push(m));
  return { opened, alerts };
}

const decode = (src: string) => decodeURIComponent(src.replace(/^javascript:/, ""));

describe("parseConnectHash", () => {
  it("reads the token and league", () => {
    // Act
    const result = parseConnectHash("#token=abc&league=myleague");

    // Assert
    expect(result).toEqual({ token: "abc", leagueId: "myleague" });
  });

  it("decodes URL-encoded values and lowercases the league", () => {
    // Act
    const result = parseConnectHash("#token=U2Fs%2B%2Fx%3D%3D&league=MyLeague");

    // Assert
    expect(result).toEqual({ token: "U2Fs+/x==", leagueId: "myleague" });
  });

  it.each([[""], ["#token=abc"], ["#league=x&token="]])("returns null for %j, which lacks a value", (hash) => {
    // Act
    const result = parseConnectHash(hash);

    // Assert
    expect(result).toBeNull();
  });
});

describe("extractToken", () => {
  it("finds the CBSi.token assignment in a league page", () => {
    // Arrange
    const html = `<script>CBSi={};CBSi.namespace=function(){};\n    CBSi.token = "U2FsdGVkX1+tok/en==";</script>`;

    // Act
    const result = extractToken(html);

    // Assert
    expect(result).toBe("U2FsdGVkX1+tok/en==");
  });

  it("returns null when the page has no token", () => {
    // Act
    const result = extractToken("<html>no token</html>");

    // Assert
    expect(result).toBeNull();
  });
});

describe("bookmarkletSource", () => {
  it("is a javascript: URL that opens Settings with the values in the fragment", () => {
    // Act
    const src = bookmarkletSource("http://localhost:6972/");

    // Assert
    expect(src.startsWith("javascript:")).toBe(true);
    expect(decode(src)).toContain('"http://localhost:6972/settings"+"#token="');
    expect(decode(src)).toContain("CBSi.token");
  });

  it("runs against a CBS page and opens the right URL", () => {
    // Arrange
    const code = decode(bookmarkletSource("http://localhost:6972/"));

    // Act
    const { opened } = runBookmarklet(code, { hostname: CBS_HOST, cbsiToken: "U2Fs+/x==" });

    // Assert
    expect(opened).toHaveLength(1);
    expect(parseConnectHash(new URL(opened[0]!).hash)).toEqual({ token: "U2Fs+/x==", leagueId: "myleague" });
  });

  it("falls back to the page HTML when CBSi isn't defined", () => {
    // Arrange
    const code = decode(bookmarkletSource("http://localhost:6972/"));

    // Act
    const { opened } = runBookmarklet(code, { hostname: CBS_HOST, html: 'CBSi.token = "fromhtml";' });

    // Assert
    expect(parseConnectHash(new URL(opened[0]!).hash)?.token).toBe("fromhtml");
  });

  it("refuses non-CBS pages with an alert", () => {
    // Arrange
    const code = decode(bookmarkletSource("http://localhost:6972/"));

    // Act
    const { opened, alerts } = runBookmarklet(code, { hostname: "example.com", html: 'CBSi.token = "fromhtml";' });

    // Assert
    expect(opened).toHaveLength(0);
    expect(alerts).toHaveLength(1);
  });
});
