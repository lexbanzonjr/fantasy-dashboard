// The bookmarklet you run on your CBS league page. It reads the league's access token (the page sets
// `CBSi.token = "..."`) and the league id (the subdomain, e.g. "myleague" in
// myleague.football.cbssports.com), then opens Settings with both in the URL fragment. A fragment is
// never sent to a server, so the token stays out of logs.

// Matches the token assignment in the page's HTML, for when CBSi isn't reachable as a global.
export const TOKEN_PATTERN = /CBSi\.token\s*=\s*"([^"]+)"/;

export function extractToken(html: string): string | null {
  return TOKEN_PATTERN.exec(html)?.[1] ?? null;
}

export function bookmarkletSource(siteUrl: string): string {
  const settings = `${siteUrl.replace(/\/+$/, "")}/settings`;
  const code = `(function(){
var t=(window.CBSi&&window.CBSi.token)||((document.documentElement.innerHTML.match(${TOKEN_PATTERN.toString()})||[])[1]);
var h=location.hostname;
if(!t||!/\\.cbssports\\.com$/.test(h)){alert("Open your CBS league page (signed in) and try again.");return;}
var l=h.split(".")[0];
window.open(${JSON.stringify(settings)}+"#token="+encodeURIComponent(t)+"&league="+encodeURIComponent(l),"_blank");
})();`;
  return `javascript:${encodeURIComponent(code.replace(/\n/g, ""))}`;
}

export interface ConnectHash {
  token: string;
  leagueId: string;
}

// Reads "#token=…&league=…". Null unless both are present.
export function parseConnectHash(hash: string): ConnectHash | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("token")?.trim();
  const leagueId = params.get("league")?.trim().toLowerCase();
  return token && leagueId ? { token, leagueId } : null;
}
