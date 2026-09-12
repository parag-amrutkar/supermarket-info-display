"use client";

import { useRouter } from "next/navigation";

import { WayfindingScreen } from "@/components/kiosk/wayfinding-screen";

type Directions = {
  aisle: string;
  rack: string;
  shelf: string;
  section: string;
};

/**
 * Adapts `WayfindingScreen` to a URL-reachable route.
 *
 * The screen takes `onBack` as a callback because inside `KioskShell` the flow
 * is state, not routes. Reached by URL, back means the store's own home screen —
 * a shopper who has been given an aisle and a shelf is finished with the
 * product, and the next thing they want is the microphone.
 *
 * Pushed rather than `router.back()`, which would land on whatever preceded it:
 * the map is reached from a product screen and also straight from a spoken
 * question on the home screen, so history is not a reliable destination. `/` is
 * the kiosk shell, which rehydrates the signed-in tenant and lands on that
 * tenant's branded home screen.
 */
export function WayfindingRoute({
  productSlug,
  productName,
  directions,
}: {
  productSlug: string;
  productName: string;
  directions: Directions;
}) {
  const router = useRouter();

  return (
    <WayfindingScreen
      onBack={() => router.push("/")}
      productSlug={productSlug}
      productName={productName}
      directions={directions}
    />
  );
}
