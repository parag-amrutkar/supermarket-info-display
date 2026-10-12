<div align="center">

<img src="docs/beacon-box-mark.svg" alt="" width="112" height="112" />

# Beacon Box

**Ask. Find. Pick.**

An AI-powered, voice-enabled in-store shopping assistant for grocery and retail.
It runs on a 9:16 portrait kiosk panel: a shopper walks up, asks where something
is, and gets the aisle, rack, and shelf back — no app, no employee.

</div>

## Asking on the kiosk

Past sign-in, the store home screen is a tap-to-speak question:
`components/kiosk/push-to-talk.tsx` anchors a microphone at the bottom in the
store's brand color. A product screen has the same control, smaller, where
three printed prompts used to sit (`components/kiosk/product-ask.tsx`). The
attract screen has no microphone. Leaving a screen unmounts the control and
cancels any recording or upload still in progress.

A tap records for at most 20 seconds, posts the audio to `/api/transcribe`, and
flashes the transcript across the panel for about two seconds before it fades.
That text is sent to `/api/chat` while the flash is still up. The home and
product screens have no typed box and do not let the shopper edit the
transcript. `hooks/use-voice-input.ts` still exposes `startListening()`,
`stopListening()`, and `cancelListening()` so a presence sensor can drive the
same capture later.

Transcription goes through OpenRouter. Set the server-only `OPENROUTER_API_KEY`
in `.env.local`; the key is never sent to the browser. `TRANSCRIPTION_MODEL` is
optional and defaults to `openai/gpt-transcribe`. Recording needs HTTPS or
`localhost`, and browser permission.

### Voice → shopping assistant → product → wayfinding

`hooks/use-shopping-ask.ts` submits the transcript to the shopping assistant in
`app/api/chat/route.ts`. The model is `AI_MODEL`, then the registry default in
`lib/ai.ts`. Spoken words never become a URL. `/product/<slug>` and
`/map/<slug>` open only when a server-side tool returns that slug.

- A question about one authored product opens its screen. The CVS kiosk has
  `/product/nyquil-severe` and `/product/lumify`. The bodega has
  `/product/white-claw`.
- "Where is it" or "find …" opens `/map/<slug>` after an inventory lookup
  confirms a shelf location for that product.
- A kind of product, such as "what cold medicine do you have?", comes back as
  up to four buttons. A product with a written screen opens that screen. Any
  other row asks the assistant where that item is. Sponsored rows are labeled
  on the button. When the rows are simulated inventory, the list says so.
- If the tools decline to navigate, the panel shows a short answer and a mic
  for a follow-up. The answer clears itself after about 45 seconds, or about
  75 seconds when products are on screen, so the next shopper does not inherit
  it.

On a product screen the slug goes with the question, so "will this make me
drowsy?" can be answered from that product's authored packaging copy without
the shopper naming it. Price, stock, and shelf location still have to come from
an inventory lookup. Asking where the product is can open its map. The
directions control on the screen links to the same `/map/<slug>` route.

Wayfinding (`app/map/[slug]/page.tsx`) reads the slug from inventory and passes
the verified aisle, rack, shelf, and section into
`components/kiosk/wayfinding-screen.tsx`. The picture is a pre-rendered CVS
walk drawn for NyQuil SEVERE at aisle 7, rack 3, shelf 4. For any other
product, or for NyQuil if inventory no longer matches that spot, a card shows
the inventory location and says the animation may not match. Back returns to
the store home screen. There is no live store plan, and nothing drives a shelf
light.

### Limits

- Inventory tools run for the CVS demo store only (`CVS-DEMO-001` in
  `lib/shopping-agent.ts`). The Sunrise bodega has no inventory connection, and
  its answers are not filled with CVS rows. Loaded CVS prices, quantities, and
  shelf locations are simulated; see Inventory database below.
- With no Supabase project, search and maps have nothing to read. Product
  pages still render, using the authored fallback price, stock, and location
  in `lib/products.ts`. Those figures are invented, and the page does not mark
  them as demo. The star ratings on that page are mocked.
- A map is shown only when the current inventory row for that store can be
  read. Otherwise the screen says the shelf location could not be verified.
- Editorial screens exist for those three products. The rest of a search
  result is an inventory row: the assistant can name an aisle, and a tap asks
  where it is, but there is no product page to open.
- Follow-up context stays in memory on the screen that asked. It is not saved,
  and navigating away starts clean. `components/kiosk/shopping-chat.tsx` is a
  typed panel with tab-local history; the kiosk does not mount it.
  `docs/shopping-agent-plan.md` is the note for that assistant. Staff sign-in
  is still the demo PIN in `lib/demo-auth.ts`. There is no speech synthesis.

Run the deterministic checks from the repository root:

```bash
node scripts/verify-voice-input.mjs
npm run test:shopping-agent
```

These simulate the voice controller, the transcription route, and the
assistant's request checks and store scoping. They do not record a microphone,
call a live model, or read a live database. Also speak a question on the
target kiosk. If this environment blocks Turbopack's CSS worker from opening a
local port, use `npm run build -- --webpack` to verify the production build.

## Supabase integration

Supabase is optional. The kiosk, transcription, and chat routes run when
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
unset; `proxy.ts` returns early in that case. Inventory search, shelf maps,
and live price and stock need a configured project.

When it is configured, the app uses `@supabase/ssr` so the same cookie-backed
authentication session is available in Client Components, Server Components,
Server Actions, and Route Handlers. The root `proxy.ts` refreshes expired
sessions before a request is rendered.

### Connect the existing project

1. Copy `.env.example` to `.env.local` if you do not already have one.
2. In the Supabase dashboard, open **Project Settings > API**.
3. Set these values in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   The publishable key is designed for browser use. Do not expose a secret or
   service-role key through a `NEXT_PUBLIC_*` variable.

4. Restart `npm run dev` after changing environment variables.

### Use Supabase

In a Client Component:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

In a Server Component, Server Action, or Route Handler:

```tsx
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
```

For authorization checks, use `supabase.auth.getClaims()` (or `getUser()` when
you need a fresh user record), not the unverified user object from
`getSession()`. Protect database tables with Row Level Security policies; the
publishable key alone is not an authorization boundary.

### Generate database types (recommended after defining the schema)

Install or run the Supabase CLI, then replace `<project-ref>`:

```bash
npx supabase gen types typescript --project-id <project-ref> > lib/supabase/database.types.ts
```

Pass the generated `Database` type to `createBrowserClient<Database>()` and
`createServerClient<Database>()` for schema-aware queries.

## Inventory database

The inventory schema is defined in `supabase/migrations`. It separates the
global product catalog from store-specific quantity, price, and shelf location.
Kiosk clients have read-only access to a minimal public view and search RPC;
table mutations and import history are not exposed to browser roles.

Validate the bundled demo inventory without touching the database:

```bash
npm run inventory:validate
```

To load it, first apply the Supabase migrations, then set the server-only
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and run:

```bash
npm run inventory:import
```

The import is atomic and idempotent by file checksum. The CVS file contains
simulated prices, quantities, and shelf locations, so imported rows retain the
`demo_simulated` provenance and the assistant labels them as demo inventory.
