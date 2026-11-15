import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/cbs/crypto";

const key = crypto.randomBytes(32).toString("base64");
const token = "U2FsdGVkX1+abc/def==";

describe("encryptToken", () => {
  it("produces an iv.tag.ciphertext string that hides the token", () => {
    // Act
    const result = encryptToken(token, key);

    // Assert
    expect(result).not.toContain(token);
    expect(result.split(".")).toHaveLength(3);
  });

  it("uses a fresh IV each time", () => {
    // Arrange
    const first = encryptToken(token, key);

    // Act
    const second = encryptToken(token, key);

    // Assert
    expect(second).not.toBe(first);
  });

  it.each([
    ["is null", null, /isn't set/],
    ["is empty", "", /isn't set/],
    ["isn't 32 bytes", crypto.randomBytes(16).toString("base64"), /decodes to 16/],
  ])("throws when the key %s", (_label, badKey, message) => {
    // Act & Assert
    expect(() => encryptToken("x", badKey)).toThrow(message);
  });
});

describe("decryptToken", () => {
  it("round-trips an encrypted token", () => {
    // Arrange
    const encrypted = encryptToken(token, key);

    // Act
    const result = decryptToken(encrypted, key);

    // Assert
    expect(result).toBe(token);
  });

  it("rejects tampered ciphertext", () => {
    // Arrange
    const [iv, tag, ct] = encryptToken("secret", key).split(".") as [string, string, string];
    const flipped = Buffer.from(ct, "base64url");
    flipped[0]! ^= 1;
    const tampered = [iv, tag, flipped.toString("base64url")].join(".");

    // Act & Assert
    expect(() => decryptToken(tampered, key)).toThrow();
  });

  it("rejects a malformed value", () => {
    // Act & Assert
    expect(() => decryptToken("not-three-parts", key)).toThrow(/Malformed/);
  });

  it("rejects a different key", () => {
    // Arrange
    const encrypted = encryptToken("secret", key);
    const other = crypto.randomBytes(32).toString("base64");

    // Act & Assert
    expect(() => decryptToken(encrypted, other)).toThrow();
  });
});
