"use client";

import { BeaconMark } from "@/components/kiosk/beacon-mark";

/**
 * The screen a Beacon Box sits on all day: full-bleed product branding, with a
 * single quiet way in. The log-in control is deliberately small and bottom-
 * anchored — this is a customer-facing display, and staff sign-in is the
 * exception, not the call to action.
 */
export function WelcomeScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="@container flex h-full w-full flex-col gap-[5cqw] px-[6cqw] py-[7cqw]">
      <header className="flex shrink-0 items-center justify-between text-[1.9cqw] tracking-[0.24em] text-muted-foreground uppercase">
        <span className="font-semibold">Beacon Box</span>
        <span className="flex items-center gap-[0.8em]">
          <span className="size-[0.6em] animate-pulse rounded-full bg-accent" />
          Device BB-0471
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[4cqw] text-center">
        <BeaconMark className="size-[26cqw] text-primary" />
        <div className="space-y-[1.5cqw]">
          <h1 className="text-[12cqw] leading-[0.92] font-semibold tracking-[-0.035em]">
            Beacon Box
          </h1>
          <p className="text-[3cqw] text-muted-foreground">
            In-store display system
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-[2.5cqw]">
        <button
          type="button"
          onClick={onLogin}
          className="rounded-xl px-[5cqw] py-[1.8cqw] text-[2.2cqw] font-medium tracking-[0.06em] text-muted-foreground uppercase ring-1 ring-foreground/20 transition-colors outline-none hover:bg-card hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/70 active:translate-y-px"
        >
          Log in
        </button>
        <p className="text-[1.7cqw] text-muted-foreground">
          Demo build · v0.1.0
        </p>
      </div>
    </div>
  );
}
