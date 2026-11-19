import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

export interface AiModel {
  client: Anthropic;
  model: string;
}

// Null when ANTHROPIC_API_KEY isn't set, so the page can say so instead of failing.
export function getModel(): AiModel | null {
  const e = env();
  if (!e.anthropicApiKey) return null;
  return { client: new Anthropic({ apiKey: e.anthropicApiKey }), model: e.anthropicModel };
}
