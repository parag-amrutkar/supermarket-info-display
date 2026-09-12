"use client";

import * as React from "react";
import { LogOut } from "lucide-react";

import { PushToTalk } from "@/components/kiosk/push-to-talk";
import { AwningStripe, TenantWordmark } from "@/components/kiosk/tenant-wordmark";
import type { Tenant } from "@/lib/tenants";

/**
 * The store's own home screen — tenant chrome at the top, the store's mark at
 * hero scale in the middle, push to talk at the bottom.
 *
 * Three elements and nothing else: content slots, promotions and the product
 * shortcut all lived here and were competing with the microphone. The hero mark
 * is identity, not content — from across an aisle it reads as *this store's*
 * screen before any of the type is legible, and it never asks to be touched, so
 * a shopper walking up still has exactly one thing to do.
 *
 * `relative`, because the transcript flash and the answer that follows it both
 * position against this element rather than the viewport.
 */

/**
 * Current minute, or null on the server.
 *
 * `useSyncExternalStore` rather than state-plus-effect: the snapshot is the
 * minute bucket, which is stable between ticks (returning `Date.now()` raw
 * would re-render forever), and the null server snapshot keeps hydration
 * consistent without a post-mount setState.
 */
function useMinute(): number | null {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, 15_000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

function Clock() {
  const minute = useMinute();
  const now = minute === null ? null : new Date(minute * 60_000);

  return (
    <span className="font-mono tabular-nums">
      {now
        ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "--:--"}
    </span>
  );
}

export function TenantDisplay({
  tenant,
  onSignOut,
}: {
  tenant: Tenant;
  onSignOut: () => void;
}) {
  return (
    <div className="@container relative flex h-full w-full flex-col overflow-hidden">
      {/* Tenant chrome. This is the moment the kiosk stops being Beacon Box
          branded and becomes the store's own screen. */}
      <header className="group flex shrink-0 items-center gap-[3cqw] bg-brand px-[5cqw] py-[3.5cqw] text-brand-foreground">
        <TenantWordmark tenant={tenant} className="text-[3.4cqw]" />
        <span className="flex-1" />
        {/* The sign-out button below is hidden at rest but still holds its
            8cqw of layout, which left a dead gap at the panel's right edge.
            So this slides across it (8cqw button + 3cqw header gap = 11cqw)
            and slides back out of the way when the button reveals, which also
            makes the reveal read as deliberate rather than as a control
            appearing out of nowhere. */}
        <span className="translate-x-[11cqw] text-right text-[1.9cqw] leading-tight opacity-85 transition-transform duration-300 ease-out group-focus-within:translate-x-0 group-hover:translate-x-0 motion-reduce:transition-none">
          <span className="block font-semibold">{tenant.storeNumber}</span>
          <Clock />
        </span>
        {/* Staff control on a customer-facing screen, so it is invisible until
            the nav is hovered. `pointer-events-none` while hidden is the part
            that matters on the panel: without it a stray tap in the corner
            signs the machine out with nothing on screen to explain why. Touch
            browsers apply sticky :hover, so on the hardware this is two taps —
            one to reveal, one to sign out. Keyboard reaches it via focus. */}
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out of this machine"
          className="pointer-events-none grid size-[8cqw] shrink-0 place-items-center rounded-xl bg-brand-foreground/15 opacity-0 transition outline-none group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-brand-foreground/25 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-brand-foreground/60"
        >
          <LogOut className="size-[4cqw]" />
        </button>
      </header>

      {tenant.brand.accent ? <AwningStripe className="h-[2cqw] shrink-0" /> : null}

      {/* Hero mark. Sized in `cqw` like everything else, and deliberately below
          the largest the wordmarks can go before the widest of them (CVS, which
          runs about 4.8em end to end) reaches the panel edge. `decorative`
          because the header above already announces the tenant's name — a
          screen reader should not hear the store twice. */}
      <div className="grid min-h-0 flex-1 place-items-center px-[6cqw]">
        <TenantWordmark
          tenant={tenant}
          decorative
          className="text-[13cqw] text-brand"
        />
      </div>

      <PushToTalk tenant={tenant} />
    </div>
  );
}
