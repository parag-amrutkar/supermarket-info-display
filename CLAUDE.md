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

**Beacon Box** — the software and screen for an in-store kiosk. The panel is a **9:16 portrait touchscreen** (1080x1920) with no keyboard. A Next.js 16 App Router app on React 19, Tailwind v4, and shadcn components.

Two design decisions carry weight: the kiosk shell and the LLM layer.

### The kiosk is one route and a state machine

`app/page.tsx` is a ten-line server component that renders `components/kiosk/kiosk-shell.tsx`. The shell is the app's **only** client boundary, and it holds the whole flow as state rather than routes:

```
boot -> welcome (Beacon Box branding, quiet log-in)
     -> picker  (which business owns this machine)
     -> pin     (staff keypad)
     -> display (tenant-branded screen)
```

Steps are state, not routes, deliberately. Sign-in is stubbed (`lib/demo-auth.ts`), so there is no cookie a server component could read — a `/display` route would be guarded by nothing and bypassable by typing the URL. One route keeps the demo honest. Adding a real session cookie is the point at which splitting into routes starts to pay.

`app/` therefore stays free of `"use client"`. Push interactivity into `components/kiosk/`.

### The panel is locked to 9:16

The shell sizes the panel with explicit `min()`s rather than `aspect-[9/16]`:

```
h-[min(100dvh,calc(100vw*16/9))]
w-[min(100vw,calc(100dvh*9/16))]
```

On 1080x1920 hardware both branches resolve to the full viewport, so it renders edge to edge with no letterbox. Off-ratio (a dev laptop) the ratio wins and the remainder becomes a black backdrop, rather than the design stretching.

Use `aspect-ratio` here and it breaks quietly: clamping one axis leaves the other at its declared size, so the ratio silently stops holding. The `min()` form cannot.

Because the panel guarantees the ratio, screens inside it carry **no max-width** — they are `h-full w-full` and size type in `cqw` against their own container. That is what makes one layout work at 1080x1920, 720x1280, and a letterboxed dev window without a breakpoint pass. Don't reintroduce a `max-w-*` on a kiosk screen; it gutters the panel on tall viewports.

### Sign-in is fake, and must stay obviously fake

`lib/demo-auth.ts` accepts **any** PIN of the right length and stores a session in `sessionStorage`. There is no server check, no token, no database. The file leads with a warning block — keep it there. Anything that makes this look like real auth is a bug.

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

- `lib/CLAUDE.md` — registry mechanics, how to add a provider, AI SDK v7 traps, tenants and the auth stub, Supabase
- `app/CLAUDE.md` — route handler conventions, streaming-error behaviour, the kiosk shell chrome
- `components/CLAUDE.md` — Base UI (not Radix), `cn` import convention, Tailwind v4 theme and fonts, `kiosk/` conventions

Two cross-cutting gotchas worth knowing before you open either directory: the shadcn components are built on **Base UI, not Radix**, so most training-data shadcn examples are wrong here; and **AI SDK v7 diverges from v5/v6-era knowledge**, so verify shapes against the installed `.d.ts` under `node_modules/` rather than from memory.

## Environment

`.env.example` documents every key. `.gitignore` blanket-ignores `.env*` with a `!.env.example` negation. Only the key for the provider actually in use is required; browsing the OpenRouter model catalog needs none.

**Supabase is optional and must stay optional.** Root `proxy.ts` runs on nearly every request and `updateSession` throws when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are unset — which turned every route, including the kiosk, into a 500. `proxy.ts` now guards on `isSupabaseConfigured()` from `lib/supabase/config.ts` and returns early when unconfigured. Keep that guard: a checkout with no Supabase project must still run the kiosk. README.md covers connecting a real project.

`next.config.ts` sets `allowedDevOrigins` for the Tailscale CGNAT range and private LAN ranges, so `next dev` can be opened on the actual panel or a phone. Without a matching entry the page loads but HMR and dev assets are blocked.

## Agent skills

Twenty HyperFrames skills — video and motion-graphics authoring — are pinned at project scope in `skills-lock.json` (source `heygen-com/hyperframes`, one content hash per skill). The skill files themselves are **not** committed: 914 files, 19 MB of fonts, audio, and texture assets. Hydrate them with

```bash
npx skills add heygen-com/hyperframes --full-depth
```

which writes `.agents/skills/` (a universal layout other agents read too) and symlinks `.claude/skills/` into it. Both paths are gitignored — the lock file is the source of truth, so re-running the command reproduces exactly the pinned versions.

`/hyperframes` is the entry point: read it first for any request to make, edit, or render a video, and it routes to the owning workflow. Project-scope skills shadow same-named ones in `~/.claude/skills/`, so this pin governs here even when a different set is installed globally.

## Note

An OpenAI Codex config exists at `~/.codex/config.toml`. If you want its MCP servers, slash commands, subagents, skills, or instructions brought into Claude Code, reply `/import` to scan and list what's importable, then `/import --yes=<digest>` (the scan output names the digest) to apply the user-level items. If `/import` isn't available on this surface, run `claude import` from a terminal.
