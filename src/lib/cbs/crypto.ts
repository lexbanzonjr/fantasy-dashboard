import "server-only";
import crypto from "node:crypto";

// AES-256-GCM for the CBS token at rest. Format: "<iv>.<tag>.<ciphertext>", each base64url.

function keyFrom(base64: string | null | undefined): Buffer {
  if (!base64) throw new Error("CBS_TOKEN_KEY isn't set. Generate one (see .env.example), then restart.");
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) throw new Error(`CBS_TOKEN_KEY must be 32 bytes of base64; it decodes to ${key.length}.`);
  return key;
}

export function encryptToken(token: string, keyBase64: string | null | undefined): string {
  const key = keyFrom(keyBase64);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64url")).join(".");
}

// Throws if the value was tampered with or encrypted under a different key.
export function decryptToken(value: string, keyBase64: string | null | undefined): string {
  const key = keyFrom(keyBase64);
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Malformed encrypted token");
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64url")) as [Buffer, Buffer, Buffer];
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
