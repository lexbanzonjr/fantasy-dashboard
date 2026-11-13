import crypto from "node:crypto";

// One username and password from .env, and a signed cookie that keeps you signed in for 30 days.
// Ported from movie-tube. Pure functions, so the proxy, route handlers, server
// actions and tests can all use them.

export const SESSION_COOKIE = "fd_session";
export const SESSION_DAYS = 30;
const MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export interface Credentials {
  username: string;
  password: string;
  sessionSecret: string | null;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest();

// The key that signs cookies. Fixed across restarts, so sessions survive them. Derived from the
// credentials unless SESSION_SECRET is set, so changing the password signs everyone out.
export function signingKey({ username, password, sessionSecret }: Credentials) {
  return sha256(sessionSecret || `fantasy-dashboard-session:${username}:${password}`);
}

function sign(key: Buffer, username: string, expires: number) {
  return crypto.createHmac("sha256", key).update(`${username}:${expires}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

// Both checked, so timing doesn't reveal which one was wrong.
export function checkCredentials(creds: Credentials, username: string, password: string) {
  const userOk = safeEqual(username, creds.username);
  const passOk = safeEqual(password, creds.password);
  return userOk && passOk;
}

// A cookie value: "<expiry ms>.<signature>".
export function createSession(creds: Credentials, now = Date.now()) {
  const expires = now + MAX_AGE_MS;
  return { value: `${expires}.${sign(signingKey(creds), creds.username, expires)}`, expires: new Date(expires) };
}

export function verifySession(creds: Credentials, value: string | undefined | null, now = Date.now()) {
  if (!value) return false;
  const [expires, sig, extra] = value.split(".");
  if (!expires || !sig || extra !== undefined || !/^\d+$/.test(expires) || Number(expires) <= now) return false;
  return safeEqual(sig, sign(signingKey(creds), creds.username, Number(expires)));
}

// Only same-site paths, so ?next= can't send you to another site after signing in.
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}
