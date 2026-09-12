# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Next dev server (Turbopack)
npm run build    # Production build; also runs a full TypeScript pass
npm run lint     # bare `eslint` (flat config), not `next lint`
npx tsc --noEmit # Typecheck alone, faster than a build
```

No test runner is configured — there is no test script, config, or test directory. Verify changes with `npx tsc --noEmit` plus `npm run build`, and route handlers by hitting them against `npm run dev`.

## Architecture

A Next.js 16 App Router digital-signage app on React 19, Tailwind v4, and shadcn components. The substantial design decision is the LLM layer.

### Models are provider-agnostic by construction

`lib/ai.ts` is the single place a model is resolved. An AI SDK v7 registry addresses every model as `"<provider>:<model>"` across `anthropic`, `openai`, `openrouter`, `gateway`, `compatible` (any OpenAI-compatible URL), and `claude-code`.

`getModel(id?)` resolves: explicit id → `AI_MODEL` env → `DEFAULT_MODEL`. So a deployment swaps providers with an env var and a client can override per request. Adding a provider touches only `lib/ai.ts`; call sites never name one.

Keep it that way — don't import a provider SDK directly into a route or component to reach a model. Generation goes through the registry.

### Two OpenRouter packages, deliberately

Both are installed and they are **not** redundant. Don't consolidate them:

- `@openrouter/ai-sdk-provider` — the `openrouter:*` registry entry, for generation.
- `@openrouter/sdk` (`lib/openrouter.ts`) — OpenRouter's own surface: model catalog, credits, generation cost and routing stats. Not expressible through a generic AI SDK provider.

### Where the detail lives

Directory-scoped `CLAUDE.md` files carry the specifics and load when you work in them:

- `lib/CLAUDE.md` — registry mechanics, how to add a provider, AI SDK v7 traps
- `app/CLAUDE.md` — route handler conventions and streaming-error behaviour
- `components/CLAUDE.md` — Base UI (not Radix), `cn` import convention, Tailwind v4

Two cross-cutting gotchas worth knowing before you open either directory: the shadcn components are built on **Base UI, not Radix**, so most training-data shadcn examples are wrong here; and **AI SDK v7 diverges from v5/v6-era knowledge**, so verify shapes against the installed `.d.ts` under `node_modules/` rather than from memory.

## Environment

`.env.example` documents every key. `.gitignore` blanket-ignores `.env*` with a `!.env.example` negation. Only the key for the provider actually in use is required; browsing the OpenRouter model catalog needs none.

## Note

An OpenAI Codex config exists at `~/.codex/config.toml`. If you want its MCP servers, slash commands, subagents, skills, or instructions brought into Claude Code, reply `/import` to scan and list what's importable, then `/import --yes=<digest>` (the scan output names the digest) to apply the user-level items. If `/import` isn't available on this surface, run `claude import` from a terminal.
