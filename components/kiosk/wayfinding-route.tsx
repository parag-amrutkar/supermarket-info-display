"use client";

import { useRouter } from "next/navigation";

import { WayfindingScreen } from "@/components/kiosk/wayfinding-screen";

/**
 * Adapts `WayfindingScreen` to a URL-reachable route.
 *
 * The screen takes `onBack` as a callback because inside `KioskShell` the flow
 * is state, not routes. Reached by URL there is no parent state to pop, so back
 * means "return to the product that sent you here" — pushed rather than
 * `router.back()`, which would land on whatever preceded it if the shopper
 * arrived from somewhere else.
 */
export function WayfindingRoute({ backHref }: { backHref: string }) {
  const router = useRouter();

  return <WayfindingScreen onBack={() => router.push(backHref)} />;
}
