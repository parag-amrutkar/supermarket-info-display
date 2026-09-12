"use client";

import type { CSSProperties } from "react";

import { cn } from "cn";

import { BeaconMark } from "@/components/kiosk/beacon-mark";

/**
 * The screen a Beacon Box sits on all day: full-bleed product branding, with a
 * single quiet way in. The log-in control is deliberately small and bottom-
 * anchored — this is a customer-facing display, and staff sign-in is the
 * exception, not the call to action.
 *
 * No microphone here on purpose. Asking a question belongs to the store's own
 * home screen, past sign-in (`push-to-talk.tsx`); this screen is the attract
 * loop and the way in, nothing else.
 *
 * It runs a continuous 28s attract loop with a full -> ambient intensity arc:
 * the mark draws itself in, the wordmark and its one line of copy resolve on a
 * short cascade, then everything decays to a slow drift before the cycle
 * restarts. A motionless panel in a supermarket
 * aisle reads as broken; this one reads as a device waiting to be asked
 * something. All of it is CSS — see the `attract-*` keyframes in globals.css
 * for the timing contract, which is what keeps the layers in phase.
 *
 * Every animated element gets its own centring wrapper. `animate-*` compiles to
 * the `animation` shorthand, whose keyframes set `transform` outright — so a
 * `-translate-x-1/2` on the same element is silently discarded once the
 * animation starts. Centre on the parent, animate the child.
 */

/** Stagger offsets for the four signal rings, in seconds: one ring every 1.75s
 *  across the 7s ring cycle. Negative, so none of them waits to first fire. */
const RING_DELAYS = [0, -1.75, -3.5, -5.25];

export function WelcomeScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="@container relative isolate h-full w-full overflow-hidden">
      {/* Ambient field — three slow blobs, drifting on periods that never line
          up with the master cycle, so the background never visibly repeats. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 motion-safe:animate-attract-field"
      >
        <div className="absolute top-[38%] left-1/2 size-[78cqw] -translate-x-1/2 -translate-y-1/2">
          <div className="size-full rounded-full bg-[radial-gradient(circle,var(--primary),transparent_70%)] opacity-30 motion-safe:animate-attract-drift-a" />
        </div>
        <div className="absolute top-[30%] left-1/2 size-[64cqw] -translate-x-1/2 -translate-y-1/2">
          <div className="size-full rounded-full bg-[radial-gradient(circle,var(--chart-2),transparent_70%)] opacity-35 motion-safe:animate-attract-drift-b" />
        </div>
        <div className="absolute top-[52%] left-1/2 size-[70cqw] -translate-x-1/2 -translate-y-1/2">
          <div className="size-full rounded-full bg-[radial-gradient(circle,var(--accent),transparent_70%)] opacity-45 motion-safe:animate-attract-drift-c" />
        </div>
      </div>

      {/* Signal rings. They echo the two arcs in the mark itself, and on a
          voice-first product they read as listening. The rings keep a constant
          7s rhythm; the container carries the full -> ambient intensity arc. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[38%] left-1/2 -z-10 size-[34cqw] -translate-x-1/2 -translate-y-1/2 motion-safe:animate-attract-intensity"
      >
        {RING_DELAYS.map((delay, i) => (
          <span
            key={delay}
            style={{ "--attract-delay": `${delay}s` } as CSSProperties}
            className={cn(
              "absolute inset-0 rounded-full border-[0.35cqw] border-primary/50 motion-safe:animate-attract-ring",
              // Nothing expands under reduced motion, so all four would stack at
              // the same radius and composite into one heavy ring. Keep one.
              i > 0 && "motion-reduce:hidden",
            )}
          />
        ))}
      </div>

      {/* The reset beat: a soft sweep down the panel as the cycle wraps. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40cqw] bg-[linear-gradient(to_bottom,transparent,var(--chart-2),transparent)] motion-reduce:hidden motion-safe:animate-attract-sweep"
      />

      {/* Content column. The slow drift is burn-in mitigation, not decoration —
          nothing bright sits on the same pixel for more than a few minutes. */}
      <div className="relative flex h-full w-full flex-col gap-[3.5cqw] px-[6cqw] py-[5cqw] motion-safe:animate-attract-shift">
        <header className="flex shrink-0 items-center justify-between text-[1.9cqw] tracking-[0.24em] text-muted-foreground uppercase">
          <span className="font-semibold">Beacon Box</span>
          <span className="flex items-center gap-[0.8em]">
            <span className="size-[0.6em] rounded-full bg-accent motion-safe:animate-pulse" />
            Device BB-0471
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3cqw] text-center">
          <div className="motion-safe:animate-attract-breathe">
            <BeaconMark
              className="size-[22cqw] text-primary"
              parts={{
                box: "[stroke-dasharray:1] motion-safe:animate-attract-draw",
                core: "[transform-box:fill-box] [transform-origin:center] motion-safe:animate-attract-core",
                signalInner:
                  "[stroke-dasharray:1] [--attract-delay:1.1s] motion-safe:animate-attract-draw",
                signalOuter:
                  "[stroke-dasharray:1] [--attract-delay:1.6s] motion-safe:animate-attract-draw",
              }}
            />
          </div>

          <div className="space-y-[1.5cqw]">
            <h1 className="text-[9.5cqw] leading-[0.92] font-semibold tracking-[-0.035em] motion-safe:animate-attract-rise">
              Beacon Box
            </h1>

            <p
              style={{ "--attract-delay": "0.35s" } as CSSProperties}
              className="text-[3cqw] text-muted-foreground motion-safe:animate-attract-rise"
            >
              Ask. Find. Pick.
            </p>
          </div>
        </div>

        <div
          style={{ "--attract-delay": "0.7s" } as CSSProperties}
          className="flex w-full shrink-0 flex-col items-center gap-[2.2cqw] motion-safe:animate-attract-enter"
        >
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
    </div>
  );
}
