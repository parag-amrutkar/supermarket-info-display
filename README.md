# Supermarket Info Display

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
