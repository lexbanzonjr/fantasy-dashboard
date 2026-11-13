import "server-only";
import type { z } from "zod";

const BASE = "https://api.cbssports.com/fantasy";

// The token is missing, wrong, or expired. The fix is to reconnect from Settings.
export class CbsAuthError extends Error {
  constructor(message = "CBS rejected the access token") {
    super(message);
    this.name = "CbsAuthError";
  }
}

// Any other CBS failure: a network error, a 5xx, or a response that doesn't match the schema.
export class CbsError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CbsError";
  }
}

export interface CbsAuth {
  token: string;
  leagueId: string;
}

export interface CbsFetchOptions {
  // Seconds to cache in Next's data cache; omit for no caching (live scoring).
  revalidate?: number;
}

export function cbsUrl(path: string, auth: CbsAuth, params: Record<string, string> = {}): URL {
  const url = new URL(`${BASE}/${path.replace(/^\/+/, "")}`);
  const query = { version: "3.0", response_format: "json", league_id: auth.leagueId, access_token: auth.token, ...params };
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url;
}

// CBS answers a bad token with 400 "Failed Authentication: error - invalid access token" (plain text).
function isAuthFailure(status: number, text: string) {
  return status === 401 || status === 403 || /failed authentication|invalid access token/i.test(text);
}

export async function cbsFetch<T extends z.ZodType>(
  schema: T,
  path: string,
  auth: CbsAuth,
  params: Record<string, string> = {},
  { revalidate }: CbsFetchOptions = {},
): Promise<z.infer<T>> {
  const url = cbsUrl(path, auth, params);
  let res: Response;
  try {
    res = await fetch(url, revalidate ? { next: { revalidate } } : { cache: "no-store" });
  } catch (err) {
    throw new CbsError(`CBS ${path}: network error`, { cause: err });
  }
  const text = await res.text();
  if (isAuthFailure(res.status, text)) throw new CbsAuthError();
  if (!res.ok) throw new CbsError(`CBS ${path}: HTTP ${res.status}`);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new CbsError(`CBS ${path}: response wasn't JSON`, { cause: err });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new CbsError(`CBS ${path}: unexpected response shape`, { cause: parsed.error });
  return parsed.data;
}
