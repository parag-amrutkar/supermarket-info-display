import type { NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // The matcher below covers nearly every route, and `updateSession` throws
  // when Supabase env vars are unset — which would make every page a 500 on a
  // checkout with no Supabase project. Returning nothing continues the request
  // unchanged, so routes that do not need auth still work.
  if (!isSupabaseConfigured()) return;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
