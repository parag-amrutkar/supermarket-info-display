import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { claudeCode } from "ai-sdk-provider-claude-code";
import { createProviderRegistry } from "ai";

/**
 * Any OpenAI-compatible endpoint: Ollama, LM Studio, vLLM, Groq, Together,
 * a self-hosted gateway. Point AI_COMPATIBLE_BASE_URL at it and it shows up in
 * the registry as `compatible:<model>` with no code change.
 */
const compatible = createOpenAICompatible({
  name: "compatible",
  baseURL: process.env.AI_COMPATIBLE_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: process.env.AI_COMPATIBLE_API_KEY,
});

/**
 * Every provider the app can talk to. Add one here and it is immediately
 * addressable as `<provider>:<model>` — nothing downstream needs to change.
 */
export const registry = createProviderRegistry({
  anthropic,
  openai,
  openrouter,
  gateway,
  compatible,
  "claude-code": claudeCode,
});

export type ProviderId =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "gateway"
  | "compatible"
  | "claude-code";

/** A fully-qualified model id, e.g. "openai:gpt-5" or "openrouter:x-ai/grok-4". */
export type ModelId = `${ProviderId}:${string}`;

export const DEFAULT_MODEL: ModelId = "anthropic:claude-opus-5";

const PROVIDER_IDS: ProviderId[] = [
  "anthropic",
  "openai",
  "openrouter",
  "gateway",
  "compatible",
  "claude-code",
];

function isModelId(value: string): value is ModelId {
  const separator = value.indexOf(":");
  return (
    separator > 0 &&
    separator < value.length - 1 &&
    PROVIDER_IDS.includes(value.slice(0, separator) as ProviderId)
  );
}

/** Thrown when a caller asks for a model the registry cannot address. */
export class InvalidModelIdError extends Error {
  constructor(readonly requested: string) {
    super(
      `Invalid model id "${requested}". Expected "<provider>:<model>" where ` +
        `provider is one of: ${PROVIDER_IDS.join(", ")}.`,
    );
    this.name = "InvalidModelIdError";
  }
}

/**
 * Resolve a model. Falls back to AI_MODEL, then DEFAULT_MODEL, so a deployment
 * can swap providers with an env var alone.
 *
 * @throws {InvalidModelIdError} if the id names an unknown provider.
 */
export function getModel(id?: string) {
  const requested = id ?? process.env.AI_MODEL ?? DEFAULT_MODEL;

  if (!isModelId(requested)) {
    throw new InvalidModelIdError(requested);
  }

  return registry.languageModel(requested);
}

/**
 * Per-request provider settings. Each provider reads only its own key and
 * ignores the rest, so this is safe to pass on every call.
 *
 * Note: these are keyed by the *registry* provider, so the `anthropic` block
 * applies to `anthropic:*` — reaching Claude via `openrouter:*` or `gateway:*`
 * means putting the equivalent options under that provider's key instead.
 */
export const providerOptions = {
  anthropic: {
    // Adaptive thinking lets the model size its own reasoning per request.
    // `display: "summarized"` is what makes it stream as reasoning parts;
    // the default omits the text entirely.
    thinking: { type: "adaptive", display: "summarized" },
  },
} as const;
