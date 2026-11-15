import { describe, expect, it } from "vitest";
import { checkCredentials, createSession, safeNext, SESSION_DAYS, verifySession, type Credentials } from "@/lib/auth/session";

const creds: Credentials = { username: "admin", password: "correct horse", sessionSecret: null };
const NOW = Date.UTC(2026, 10, 4);
const DAY = 86_400_000;

describe("createSession", () => {
  it("expires the cookie after SESSION_DAYS", () => {
    // Act
    const { expires } = createSession(creds, NOW);

    // Assert
    expect(expires.getTime()).toBe(NOW + SESSION_DAYS * DAY);
  });
});

describe("verifySession", () => {
  it.each([
    ["when just made", 0],
    ["29 days later", 29 * DAY],
  ])("accepts its own cookie %s", (_label, offset) => {
    // Arrange
    const { value } = createSession(creds, NOW);

    // Act
    const result = verifySession(creds, value, NOW + offset);

    // Assert
    expect(result).toBe(true);
  });

  it("rejects a cookie at its expiry time", () => {
    // Arrange
    const { value, expires } = createSession(creds, NOW);

    // Act
    const result = verifySession(creds, value, expires.getTime());

    // Assert
    expect(result).toBe(false);
  });

  it.each([
    ["a pushed-back expiry", (exp: string, sig: string) => `${Number(exp) + 1000}.${sig}`],
    ["an altered signature", (exp: string, sig: string) => `${exp}.${sig.slice(0, -2)}xx`],
    ["an extra segment", (exp: string, sig: string) => `${exp}.${sig}.extra`],
  ])("rejects a cookie with %s", (_label, tamper) => {
    // Arrange
    const [exp, sig] = createSession(creds, NOW).value.split(".") as [string, string];

    // Act
    const result = verifySession(creds, tamper(exp, sig), NOW);

    // Assert
    expect(result).toBe(false);
  });

  it.each([["abc.def"], [""], [undefined]])("rejects the malformed or missing cookie %j", (cookie) => {
    // Act
    const result = verifySession(creds, cookie, NOW);

    // Assert
    expect(result).toBe(false);
  });

  it.each([
    ["the password changes", { password: "new" }],
    ["a session secret is set", { sessionSecret: "s3cret" }],
  ])("rejects an old cookie once %s", (_label, change) => {
    // Arrange
    const { value } = createSession(creds, NOW);

    // Act
    const result = verifySession({ ...creds, ...change }, value, NOW);

    // Assert
    expect(result).toBe(false);
  });

  it("ignores password changes when a session secret signs cookies", () => {
    // Arrange
    const withSecret = { ...creds, sessionSecret: "s3cret" };
    const { value } = createSession(withSecret, NOW);

    // Act
    const result = verifySession({ ...withSecret, password: "changed" }, value, NOW);

    // Assert
    expect(result).toBe(true);
  });
});

describe("checkCredentials", () => {
  it("accepts the right username and password", () => {
    // Act
    const result = checkCredentials(creds, "admin", "correct horse");

    // Assert
    expect(result).toBe(true);
  });

  it.each([
    ["a wrong password", "admin", "wrong"],
    ["a differently-cased username", "Admin", "correct horse"],
    ["empty values", "", ""],
  ])("rejects %s", (_label, username, password) => {
    // Act
    const result = checkCredentials(creds, username, password);

    // Assert
    expect(result).toBe(false);
  });
});

describe("safeNext", () => {
  it.each([["/movies?sort=year"], ["/tv/3/season/1"]])("keeps the on-site path %s", (path) => {
    // Act
    const result = safeNext(path);

    // Assert
    expect(result).toBe(path);
  });

  it.each([["//evil.example"], ["/\\evil.example"], ["https://evil.example/"], ["movies"], [""], [null], [undefined], [42]])(
    "sends %j home",
    (bad) => {
      // Act
      const result = safeNext(bad);

      // Assert
      expect(result).toBe("/");
    },
  );
});
