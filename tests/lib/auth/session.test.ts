import { describe, expect, it } from "vitest";
import { checkCredentials, createSession, safeNext, SESSION_DAYS, verifySession, type Credentials } from "@/lib/auth/session";

const creds: Credentials = { username: "admin", password: "correct horse", sessionSecret: null };
const NOW = Date.UTC(2026, 10, 4);

describe("sessions", () => {
  it("verify the cookie they made, for 30 days", () => {
    const { value, expires } = createSession(creds, NOW);
    expect(expires.getTime()).toBe(NOW + SESSION_DAYS * 86_400_000);
    expect(verifySession(creds, value, NOW)).toBe(true);
    expect(verifySession(creds, value, NOW + 29 * 86_400_000)).toBe(true);
    expect(verifySession(creds, value, expires.getTime())).toBe(false);
  });

  it("reject tampered, malformed and missing cookies", () => {
    const { value } = createSession(creds, NOW);
    const [expires, sig] = value.split(".");
    expect(verifySession(creds, `${Number(expires) + 1000}.${sig}`, NOW)).toBe(false);
    expect(verifySession(creds, `${expires}.${sig!.slice(0, -2)}xx`, NOW)).toBe(false);
    expect(verifySession(creds, `${value}.extra`, NOW)).toBe(false);
    expect(verifySession(creds, "abc.def", NOW)).toBe(false);
    expect(verifySession(creds, "", NOW)).toBe(false);
    expect(verifySession(creds, undefined, NOW)).toBe(false);
  });

  it("stop working when the password or secret changes", () => {
    const { value } = createSession(creds, NOW);
    expect(verifySession({ ...creds, password: "new" }, value, NOW)).toBe(false);
    expect(verifySession({ ...creds, sessionSecret: "s3cret" }, value, NOW)).toBe(false);
    const withSecret = { ...creds, sessionSecret: "s3cret" };
    const signed = createSession(withSecret, NOW).value;
    // With a secret set, the password no longer signs cookies.
    expect(verifySession({ ...withSecret, password: "changed" }, signed, NOW)).toBe(true);
  });
});

describe("checkCredentials", () => {
  it("needs both the username and the password", () => {
    expect(checkCredentials(creds, "admin", "correct horse")).toBe(true);
    expect(checkCredentials(creds, "admin", "wrong")).toBe(false);
    expect(checkCredentials(creds, "Admin", "correct horse")).toBe(false);
    expect(checkCredentials(creds, "", "")).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/movies?sort=year")).toBe("/movies?sort=year");
    expect(safeNext("/tv/3/season/1")).toBe("/tv/3/season/1");
  });

  it("sends everything else home", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example/", "movies", "", null, undefined, 42]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
