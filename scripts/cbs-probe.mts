// Calls each CBS endpoint the app uses and saves the raw JSON as test fixtures, with personal
// details scrubbed. Run: node --env-file=.env.local scripts/cbs-probe.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://api.cbssports.com/fantasy";
const OUT = path.join(import.meta.dirname, "..", "src", "lib", "cbs", "__fixtures__");

const leagueId = process.env.CBS_LEAGUE_ID?.trim();
const token = process.env.CBS_TOKEN?.trim();
if (!leagueId || !token) {
  console.error("Set CBS_LEAGUE_ID and CBS_TOKEN in .env.local");
  process.exit(1);
}

// Keys whose values identify a person. Replaced with stable placeholders.
const PERSONAL = /^(name|first_name|last_name|email|owner|owners|user_id|logo|profile_url|commissioner)$/i;
const placeholders = new Map<string, string>();

function scrub(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) return value.map((v) => scrub(v, key));
  if (value && typeof value === "object") {
    // Owner objects: keep the shape, replace who they are.
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubField(k, v, key)]));
  }
  if (typeof value === "string") return value.split(token!).join("<TOKEN>").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "user@example.com");
  return value;
}

function scrubField(k: string, v: unknown, parent: string): unknown {
  const inOwner = /owner|commissioner/i.test(parent);
  const ownerField = inOwner && (PERSONAL.test(k) || k === "id");
  if (typeof v === "string" && (/email|logged_in_owner/i.test(k) || ownerField)) {
    const id = `${k}:${v}`;
    if (!placeholders.has(id)) placeholders.set(id, `${k}-${placeholders.size + 1}`);
    return placeholders.get(id);
  }
  return scrub(v, PERSONAL.test(k) ? k : parent || k);
}

async function get(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}/${endpoint}`);
  const query = { version: "3.0", response_format: "json", access_token: token!, league_id: leagueId!, ...params };
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { non_json: text.slice(0, 500) };
  }
  return { status: res.status, body };
}

function save(name: string, status: number, body: unknown) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(scrub(body), null, 2) + "\n");
  const keys = body && typeof body === "object" ? Object.keys((body as { body?: object }).body ?? body) : [];
  console.log(`${status} ${name}  keys: ${keys.join(", ")}`);
}

mkdirSync(OUT, { recursive: true });

const endpoints: [string, string, Record<string, string>?][] = [
  ["league-details", "league/details"],
  ["league-teams", "league/teams"],
  ["league-standings", "league/standings/overall"],
  ["league-scoring-live", "league/scoring/live"],
  ["league-schedules", "league/schedules"],
];

let firstTeamId: string | undefined;
for (const [name, endpoint, params] of endpoints) {
  const { status, body } = await get(endpoint, params);
  save(name, status, body);
  if (name === "league-teams") {
    const teams = (body as { body?: { teams?: { id?: string | number }[] } }).body?.teams;
    firstTeamId = teams?.[0]?.id?.toString();
  }
}

if (firstTeamId) {
  const { status, body } = await get("league/rosters", { team_id: firstTeamId });
  save("league-rosters", status, body);
} else {
  console.log("No team id found in league/teams; skipped league/rosters");
}
