# app/

Next.js 16 App Router. Read the relevant guide under `node_modules/next/dist/docs/01-app/` before writing routing code — this Next version has breaking changes from older conventions.

Everything here is currently a server component; there is no `"use client"` in this directory yet. Keep it that way where possible and push interactivity into `components/`.

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
