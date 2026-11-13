import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

const key = crypto.randomBytes(32).toString("base64");

describe("token encryption", () => {
  it("round-trips a token, with a fresh IV each time", () => {
    const token = "U2FsdGVkX1+abc/def==";
    const a = encryptToken(token, key);
    const b = encryptToken(token, key);
    expect(a).not.toBe(b);
    expect(a).not.toContain(token);
    expect(a.split(".")).toHaveLength(3);
    expect(decryptToken(a, key)).toBe(token);
    expect(decryptToken(b, key)).toBe(token);
  });

  it("rejects tampered ciphertext", () => {
    const [iv, tag, ct] = encryptToken("secret", key).split(".") as [string, string, string];
    const flipped = Buffer.from(ct, "base64url");
    flipped[0]! ^= 1;
    expect(() => decryptToken([iv, tag, flipped.toString("base64url")].join("."), key)).toThrow();
    expect(() => decryptToken("not-three-parts", key)).toThrow(/Malformed/);
  });

  it("rejects a different key", () => {
    const other = crypto.randomBytes(32).toString("base64");
    expect(() => decryptToken(encryptToken("secret", key), other)).toThrow();
  });

  it("requires a 32-byte key", () => {
    expect(() => encryptToken("x", null)).toThrow(/isn't set/);
    expect(() => encryptToken("x", "")).toThrow(/isn't set/);
    expect(() => encryptToken("x", crypto.randomBytes(16).toString("base64"))).toThrow(/decodes to 16/);
  });
});
