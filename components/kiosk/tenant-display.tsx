"use client";

import * as React from "react";
import { CalendarDays, Image as ImageIcon, LogOut, Tag } from "lucide-react";
import { cn } from "cn";

import { BeaconMark } from "@/components/kiosk/beacon-mark";
import { AwningStripe, TenantWordmark } from "@/components/kiosk/tenant-wordmark";
import type { DemoSession } from "@/lib/demo-auth";
import type { Tenant } from "@/lib/tenants";

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

/** An unfilled content region. Explicitly labelled as empty rather than faked
 *  with stock imagery, so the demo does not imply content that does not exist. */
function ContentSlot({
  icon: Icon,
  label,
  hint,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-[1.5cqw] rounded-2xl p-[3cqw] text-center",
        // `ring-dashed` does not exist — rings are box-shadows and cannot dash.
        "border-2 border-dashed border-foreground/20 bg-card/60",
        className,
      )}
    >
      <Icon className="size-[6cqw] text-brand" />
      <span className="text-[2.4cqw] font-medium">{label}</span>
      <span className="text-[1.9cqw] text-muted-foreground">{hint}</span>
    </div>
  );
}

export function TenantDisplay({
  tenant,
  session,
  onSignOut,
}: {
  tenant: Tenant;
  session: DemoSession;
  onSignOut: () => void;
}) {
  const signedInAt = new Date(session.signedInAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="@container flex h-full w-full flex-col">
      {/* Tenant chrome. This is the moment the kiosk stops being Beacon Box
          branded and becomes the store's own screen. */}
      <header className="flex shrink-0 items-center gap-[3cqw] bg-brand px-[5cqw] py-[3.5cqw] text-brand-foreground">
        <TenantWordmark tenant={tenant} className="text-[3.4cqw]" />
        <span className="flex-1" />
        <span className="text-right text-[1.9cqw] leading-tight opacity-85">
          <span className="block font-semibold">{tenant.storeNumber}</span>
          <Clock />
        </span>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out of this machine"
          className="grid size-[8cqw] shrink-0 place-items-center rounded-xl bg-brand-foreground/15 transition-colors outline-none hover:bg-brand-foreground/25 focus-visible:ring-4 focus-visible:ring-brand-foreground/60"
        >
          <LogOut className="size-[4cqw]" />
        </button>
      </header>

      {tenant.brand.accent ? <AwningStripe className="h-[2cqw] shrink-0" /> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-[3cqw] p-[5cqw]">
        <div className="flex items-baseline justify-between gap-[2cqw]">
          <h1 className="text-[3.6cqw] leading-tight font-semibold">
            Signed in · {tenant.name}
          </h1>
          <span className="shrink-0 text-[1.9cqw] text-muted-foreground">
            since {signedInAt}
          </span>
        </div>
        <p className="text-[2.1cqw] text-muted-foreground">
          {tenant.address} — this screen is now managed by this account.
        </p>

        <ContentSlot
          icon={ImageIcon}
          label="Featured content"
          hint="No content scheduled for this slot"
          className="min-h-0 flex-1"
        />
        <div className="grid shrink-0 grid-cols-2 gap-[3cqw]">
          <ContentSlot
            icon={Tag}
            label="Promotions"
            hint="Empty"
            className="aspect-[4/3]"
          />
          <ContentSlot
            icon={CalendarDays}
            label="Store hours"
            hint="Empty"
            className="aspect-[4/3]"
          />
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-[1.5cqw] border-t border-foreground/15 py-[2.5cqw] text-[1.7cqw] text-muted-foreground">
        <BeaconMark className="size-[3cqw]" />
        Powered by Beacon Box · Device BB-0471
      </footer>
    </div>
  );
}
