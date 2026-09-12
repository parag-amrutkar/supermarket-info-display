# lib/

Shared non-UI code. `utils.ts` is a shadcn-generated re-export shim (`export { cn } from "cn"`) — leave it alone and import `cn` from the bare `cn` package, as the components do.

## ai.ts — the model registry

The single place models are resolved. An AI SDK v7 `createProviderRegistry` addresses every model as `"<provider>:<model>"`:

| Provider | Reaches |
|---|---|
| `anthropic` | Claude direct |
| `openai` | OpenAI direct |
| `openrouter` | OpenRouter's catalog |
| `gateway` | Vercel AI Gateway |
| `compatible` | any OpenAI-compatible URL (Ollama, LM Studio, vLLM, Groq, Together) |
| `claude-code` | local Claude Code, on a Pro/Max subscription instead of a key |

`getModel(id?)` resolves: explicit id → `AI_MODEL` env → `DEFAULT_MODEL`. It throws `InvalidModelIdError` for an unknown provider, which callers are expected to map to a 400 rather than let 500.

**Adding a provider** means three edits, all in this file: the registry object, the `ProviderId` union, and the `PROVIDER_IDS` runtime array. The union and the array must stay in sync — the array is what validation actually checks. Nothing outside this file changes.

`providerOptions` is keyed by *registry provider name*, and each provider ignores keys that aren't its own, so it is safe to pass on every call. The `anthropic` block therefore only applies to `anthropic:*`; reaching Claude through `openrouter:*` or `gateway:*` needs equivalent options under that provider's key.

`claude-code` spawns a local CLI. It cannot run on edge or short-lived serverless.

## openrouter.ts — OpenRouter's own SDK

Deliberately separate from the `openrouter:*` registry entry. Do not consolidate them:

- registry entry (`@openrouter/ai-sdk-provider`) — generation, through the swappable `streamText` path.
- this client (`@openrouter/sdk`) — model catalog, credits, per-generation cost and routing stats, app attribution. None of it is expressible through a generic AI SDK provider.

OpenRouter's published docs show `chat.send({ messages, model })`, but the shipped types nest it as `chat.send({ chatRequest: { ... } })`. The docs example will not compile; trust the types.

## AI SDK v7 traps

v7 diverges from v5/v6-era knowledge. Both of these surface as compile errors, not silent breakage:

- `convertToModelMessages` is **async** — it returns a Promise.
- The Anthropic provider's exported `AnthropicLanguageModelOptions` is **not** assignable to the `SharedV4ProviderOptions` that `streamText` accepts. `providerOptions` is left unannotated on purpose so the inferred literal type is used; don't "fix" it by adding the type.

Check shapes against the installed `.d.ts` under `node_modules/` rather than from memory.

## Style

Hand-written files here use semicolons. `utils.ts` doesn't because shadcn generated it.
