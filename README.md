# Supermarket Info Display

## Voice transcription

The kiosk welcome and signed-in store screens support tap-to-speak questions
with a typed fallback through `components/kiosk/voice-input.tsx`. The panel
uses the store's brand colors and the shared `useVoiceInput` controller; moving
between screens unmounts it and cancels any pending recording or upload. Set the
server-only `OPENROUTER_API_KEY` in `.env.local`; the key is never sent to the
browser. `TRANSCRIPTION_MODEL` is optional and defaults to `openai/gpt-transcribe`.

Microphone recording requires HTTPS or `localhost` and browser permission. Each
recording stops automatically after 20 seconds. The reusable controller in
`hooks/use-voice-input.ts` exposes `startListening()`, `stopListening()`, and
`cancelListening()` so a future presence sensor can activate the same flow.

This MVP captures and transcribes the question. It does not submit the text to
inventory search yet.

The existing Supabase proxy also requires the Supabase environment variables
below, including for the home page and transcription route.

Run the deterministic voice regression checks from the repository root:

```bash
node scripts/verify-voice-input.mjs
```

These simulate controller lifecycle events and the upstream transcription API;
they do not record the microphone or spend API credits. Also test a real spoken
question on the target kiosk to verify permissions, recording format, and
transcription accuracy. If this environment blocks Turbopack's CSS worker from
opening a local port, use `npm run build -- --webpack` to verify the production
build.

## Supabase integration

The app uses `@supabase/ssr` so the same cookie-backed authentication session is
available in Client Components, Server Components, Server Actions, and Route
Handlers. The root `proxy.ts` refreshes expired sessions before a request is
rendered.

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
