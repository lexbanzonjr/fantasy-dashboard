import "server-only";
import path from "node:path";
import { z } from "zod";

export interface Env {
  dataDir: string;
  // Public URL of the app, used by the CBS bookmarklet.
  siteUrl: string;
  // The one login. Null until set; the app refuses to serve pages without it.
  authUsername: string | null;
  authPassword: string | null;
  sessionSecret: string | null;
  // 32 random bytes, base64, for encrypting the CBS token. Checked when used.
  cbsTokenKey: string | null;
  // For pickup research. Null turns the feature off with a message instead of an error.
  anthropicApiKey: string | null;
  anthropicModel: string;
}

const schema = z.object({
  DATA_DIR: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url("expected a URL like http://localhost:6972").optional().or(z.literal("")),
  AUTH_USERNAME: z.string().optional(),
  AUTH_PASSWORD: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  CBS_TOKEN_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
});

// Validates the environment. Throws one Error listing every problem.
export function parseEnv(raw: Record<string, string | undefined>, cwd = process.cwd()): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid fantasy-dashboard settings in .env:\n  ${lines.join("\n  ")}`);
  }
  const e = parsed.data;
  return {
    dataDir: path.resolve(cwd, e.DATA_DIR?.trim() || "data"),
    siteUrl: (e.NEXT_PUBLIC_SITE_URL || "http://localhost:6972").replace(/\/+$/, ""),
    authUsername: e.AUTH_USERNAME?.trim() || null,
    authPassword: e.AUTH_PASSWORD || null,
    sessionSecret: e.SESSION_SECRET?.trim() || null,
    cbsTokenKey: e.CBS_TOKEN_KEY?.trim() || null,
    anthropicApiKey: e.ANTHROPIC_API_KEY?.trim() || null,
    anthropicModel: e.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5",
  };
}

const globalForEnv = globalThis as unknown as { __fantasyDashboardEnv?: Env };

// The validated settings, read once from process.env.
export function env(): Env {
  return (globalForEnv.__fantasyDashboardEnv ??= parseEnv(process.env));
}
