# lib/

Shared non-UI code. `utils.ts` is a shadcn-generated re-export shim (`export { cn } from "cn"`) — leave it alone and import `cn` from the bare `cn` package, as the components do.

## tenants.ts — who owns the machine

The demo tenants (a CVS-branded chain screen and an invented NYC bodega) plus `PIN_LENGTH` and `brandStyle()`.

Brand colours are plain `oklch()` strings, not Tailwind classes, because `brandStyle()` assigns them to `--brand*` custom properties in an inline style. That re-skins a whole subtree with no per-tenant CSS — but only because `app/globals.css` uses `@theme **inline**`, which makes `bg-brand` compile to a live `var(--brand)`. See `components/CLAUDE.md`.

One asymmetry worth knowing: `oklch()` written in `globals.css` is downleveled to hex at build time, but inline styles bypass that and ship as literal `oklch()`. Fine on any 2023+ browser; an ancient Android WebView panel would drop tenant colours while keeping the house theme.

The CVS entry is an **unlicensed placeholder** for an internal demo — the wordmark is drawn as text and inline SVG, and no logo asset is fetched or committed. Keep it that way until real assets arrive under agreement.

## demo-auth.ts — not authentication

Accepts **any** PIN of the right length and keeps a fake session in `sessionStorage`. No server check, no token, no database, no revocation. The file opens with a warning block; keep it, and keep the module name honest.

`verifyPin` is async with a deliberate ~320 ms delay so the keypad has a "checking" state — an instant transition reads as a glitch, not a sign-in. The `wrong-pin` branch is currently unreachable but is the shape a real check will return, and the keypad already renders it.

Making it real means moving credentials out of client-reachable code, verifying in a route handler or server action, issuing an httpOnly cookie, and gating on it server-side. That is also the point at which the kiosk flow could become real routes.

## supabase/ — optional, and must stay optional

`client.ts`, `server.ts`, `proxy.ts` and `config.ts` wrap `@supabase/ssr`. Root `proxy.ts` calls `updateSession` on nearly every request.

`getSupabaseConfig()` **throws** when the env vars are unset, which took every route down with a 500 — including the kiosk, which uses no auth. `config.ts` therefore also exports `isSupabaseConfigured()`, and root `proxy.ts` returns early on it. Don't remove that guard: a clone with no Supabase project has to still run the app.

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
