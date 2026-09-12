"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "cn";

import type { TenantAd } from "@/lib/tenants";

/**
 * The spots a chain screen opens with: played once each, in order, then the
 * store's own screen.
 *
 * The sibling of `ad-loop-screen.tsx`, and deliberately not the same component.
 * That one is a resting state — one spot, looping forever, where "touch anywhere
 * to begin" is how a shopper gets in. This one is a sequence that finishes on its
 * own, so it needs an index, a hand-off, and a reason for a shopper not to wait
 * through it: touching anywhere at any point leaves the whole run and opens the
 * home screen, rather than advancing to the next spot.
 *
 * Every spot is rendered as its own stacked `<video>` and the active one is
 * revealed, rather than swapping `src` on a single element — that shows a frame
 * of black at each cut. Only the current spot and the one after it are told to
 * preload, so a long playlist does not pull every file down at sign-in; with two
 * spots that means both, and the second has a full fifteen seconds to arrive.
 *
 * Covers the whole panel, positioned by the `h-full w-full` root rather than
 * `fixed`, which would escape the 9:16 panel on an off-ratio dev window.
 */
export function AdIntroScreen({
  spots,
  onOpenHome,
}: {
  /** At least one. `KioskShell` only reaches this step for a non-empty list. */
  spots: TenantAd[];
  onOpenHome: () => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([]);
  const spot = spots[index];

  // The sound choice carries across a cut, so a shopper who mutes the first spot
  // is not shouted at by the second. Held in a ref beside the state because the
  // playback effect below must read it without taking it as a dependency — as a
  // dependency, muting mid-spot would restart that spot from zero. Both are
  // written together by `applyMuted`, never during render.
  const mutedRef = React.useRef(false);
  const applyMuted = React.useCallback((next: boolean) => {
    mutedRef.current = next;
    setMuted(next);
  }, []);

  // Sound up, which no browser grants unconditionally. The PIN tap that got us
  // here is user activation and is usually enough — but activation is transient,
  // so fall back to a muted play rather than a frozen first frame. Re-runs per
  // spot: each cut is a different element that has never been started.
  React.useEffect(() => {
    const video = videoRefs.current[index];
    if (!video) return;
    setReady(false);
    video.currentTime = 0;
    video.muted = mutedRef.current;
    void video.play().catch(() => {
      video.muted = true;
      applyMuted(true);
      void video.play();
    });
  }, [applyMuted, index]);

  /** Only the spot actually on screen may advance the run. */
  const handleEnded = (endedIndex: number) => {
    if (endedIndex !== index) return;
    if (index + 1 < spots.length) setIndex(index + 1);
    else onOpenHome();
  };

  const toggleSound = () => {
    const video = videoRefs.current[index];
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    applyMuted(next);
    // Unmuting outside a user gesture makes Chrome pause the element rather
    // than refuse the change, so resume instead of assuming the spot survived.
    void video.play();
  };

  return (
    // Brand ground rather than black: the spot fades in once it can play, and a
    // few hundred milliseconds of the store's own red reads as the screen waking
    // up. Black reads as a dead panel.
    <div className="@container relative h-full w-full overflow-hidden bg-brand">
      {spots.map((item, i) => (
        <video
          key={item.src}
          ref={(node) => {
            videoRefs.current[i] = node;
          }}
          src={item.src}
          playsInline
          preload={i <= index + 1 ? "auto" : "none"}
          aria-hidden
          onCanPlay={() => {
            if (i === index) setReady(true);
          }}
          onEnded={() => handleEnded(i)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            i !== index ? "invisible opacity-0" : ready ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* The videos carry no accessible content of their own, so name what is
          playing rather than leaving the screen silent to a reader. */}
      <p aria-live="polite" className="sr-only">
        Advertisement {index + 1} of {spots.length} — {spot.advertiser}
      </p>

      {/* The whole panel is the way out. A sibling that covers the frame rather
          than a wrapper around it: the sound control is interactive too, and
          nesting one button inside another is invalid and unreachable by
          keyboard. Ordered first so the later siblings stack above it. */}
      <button
        type="button"
        onClick={onOpenHome}
        aria-label="Skip the advertisements and open the store home screen"
        className="absolute inset-0 flex items-end justify-center pb-[6cqw] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset"
      >
        <span className="rounded-full bg-black/45 px-[4cqw] py-[1.8cqw] text-[2.2cqw] font-medium tracking-[0.08em] text-white uppercase backdrop-blur-sm motion-safe:animate-pulse">
          Touch anywhere to begin
        </span>
      </button>

      {/* How much of the run is left, so waiting through it is an informed
          choice. Only earns its place for a real sequence. */}
      {spots.length > 1 ? (
        <div
          aria-hidden
          className="absolute bottom-[3cqw] left-1/2 z-10 flex -translate-x-1/2 gap-[1.4cqw]"
        >
          {spots.map((item, i) => (
            <span
              key={item.src}
              className={cn(
                "h-[0.9cqw] rounded-full transition-all duration-300",
                i === index ? "w-[6cqw] bg-white/90" : "w-[2cqw] bg-white/40",
              )}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleSound}
        aria-label={
          muted
            ? `Unmute the ${spot.advertiser} advertisement`
            : `Mute the ${spot.advertiser} advertisement`
        }
        className="absolute top-[5cqw] right-[5cqw] z-10 grid size-[10cqw] place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors outline-none hover:bg-black/70 focus-visible:ring-4 focus-visible:ring-white/70"
      >
        {muted ? (
          <VolumeX className="size-[4.5cqw]" />
        ) : (
          <Volume2 className="size-[4.5cqw]" />
        )}
      </button>
    </div>
  );
}
