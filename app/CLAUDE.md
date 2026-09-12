# app/

Next.js 16 App Router. Read the relevant guide under `node_modules/next/dist/docs/01-app/` before writing routing code — this Next version has breaking changes from older conventions.

Everything here is a server component; there is no `"use client"` in this directory. **Keep it that way** — the kiosk's entire client boundary is `components/kiosk/kiosk-shell.tsx`, and `page.tsx` exists only to hand it the tenant list.

## The kiosk shell chrome

`page.tsx` renders `<KioskShell tenants={TENANTS} />` and nothing else. The flow (welcome → picker → PIN → display) is state inside that component, not routes — see the root `CLAUDE.md` for why.

`layout.tsx` carries the three things that make this behave like a panel rather than a web page:

- **Light mode, deliberately.** Nothing sets `.dark`, so the dark palette in `globals.css` is inert. Don't add it back without being asked — the kiosk is designed light, and `colorScheme: "light"` in the `viewport` export matches. Light mode used to have a real bug (`--muted-foreground` was a copy of `--foreground`, so `text-muted-foreground` de-emphasised nothing); that token is fixed in `:root` and the value is contrast-checked, so leave it alone.
- **A `viewport` export.** `userScalable: false` and `maximumScale: 1` are the load-bearing fields — a pinch-zoomed kiosk stays zoomed forever with no way to undo it. `themeColor` is `#f8f9fa`, the hex `--background` compiles to; if you change the background, change this or the browser toolbar tint drifts.
- **Kiosk body classes.** `h-dvh overflow-hidden overscroll-none touch-manipulation select-none` plus `[-webkit-tap-highlight-color:transparent]`. `touch-manipulation` is the one that matters most for feel: it removes the 300 ms double-tap-zoom delay. `dvh`, not `vh`, so mobile browser chrome cannot clip the panel.

`viewport` and `generateViewport` cannot both be exported from one segment, and both are server-components-only.

## proxy.ts affects every route here

Root `proxy.ts` (Next 16's middleware) matches nearly everything under `app/`. It refreshes Supabase auth claims — but only when Supabase is configured; it returns early otherwise. If a route starts 500ing with "Missing Supabase environment variables", that guard is what went missing.

## Route handlers

`route.ts` and `page.tsx` cannot coexist in the same segment. Handlers are not cached by default; `GET` can opt in.

Existing endpoints:

- `api/chat` — streaming chat. Reads `{ messages, model? }`, where `model` is an optional `"<provider>:<model>"` override. Resolves through `getModel()` from `@/lib/ai`, returns `result.toUIMessageStreamResponse()`. `maxDuration` is raised because streaming outlives the default budget.
- `api/models` — OpenRouter's catalog via `@/lib/openrouter`. Public endpoint, no key needed.

### Two things that bite

**Invalid model ids must become 400s.** `getModel()` throws `InvalidModelIdError` for an unknown provider. Catch that specific class and return `Response.json(..., { status: 400 })`; re-throw everything else. Without the catch it surfaces as a bare 500 with an empty body.

**Errors inside a stream do not become HTTP errors.** Once `toUIMessageStreamResponse()` starts, the response is already 200. A failure mid-stream arrives as an `{"type":"error"}` chunk with a generic message, and the real cause only appears in server logs. When debugging a chat request that "returns 200 but does nothing", read the dev server output.

`api/models` sets `revalidate`, so it is prerendered at build time and the build depends on OpenRouter being reachable. Switch it to `export const dynamic = "force-dynamic"` if that fragility isn't wanted.

## Styling and types

Global theme tokens live in `globals.css` (`@theme inline`) — Tailwind v4, CSS-first, no `tailwind.config.*`. `components/CLAUDE.md` covers the palette and the traps in editing it.

`layout.tsx` loads the theme's two fonts through `next/font/google` and exposes them on `<html>` as `--font-outfit` and `--font-fira-code`; `globals.css` points `--font-sans` and `--font-mono` at those. Neither file makes sense alone — change a font and you change both.

Types like `LayoutProps<"/">` are Next 16 generated globals and need no import.

## Style

Files here use semicolons and double quotes.
