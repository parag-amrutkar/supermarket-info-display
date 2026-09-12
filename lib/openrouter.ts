import { OpenRouter } from "@openrouter/sdk";

/**
 * OpenRouter's own client SDK.
 *
 * This is deliberately separate from the `openrouter:*` entry in the AI SDK
 * registry (`lib/ai.ts`). They do different jobs:
 *
 *   - `lib/ai.ts`      — generation, through the provider-agnostic `streamText`
 *                        path, so the model stays swappable.
 *   - this client      — OpenRouter's own surface: browsing the model catalog
 *                        and its pricing, credit balance, per-generation cost
 *                        and routing stats. None of that is expressible through
 *                        a generic AI SDK provider.
 *
 * The attribution fields are what identify this app on OpenRouter's rankings
 * and dashboard; they are set once here rather than per request.
 */
export const openrouterClient = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  httpReferer: process.env.OPENROUTER_APP_URL,
  appTitle: process.env.OPENROUTER_APP_TITLE ?? "Supermarket Info Display",
});
