"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "cn";

import type { TenantAd } from "@/lib/tenants";

/**
 * The screen a tenant rests on when that tenant is an advertising surface: the
 * spot plays full-bleed, edge to edge, with sound, on a seamless loop. Touching
 * anywhere leaves it for the store's own home screen.
 *
 * The bodega is the case this exists for. A single screen behind the counter
 * earns its keep by selling the cooler next to it, so `sunrise-deli` carries an
 * `ad` in `lib/tenants.ts` and lands here after sign-in. Drop the field and
 * that tenant goes straight to `TenantDisplay` instead, with no other change.
 *
 * There is deliberately no sign-out here — this is the customer-facing face of
 * the machine, and staff controls live one touch away on the home screen.
 *
 * The spot is 1080x1920, matching the panel, so `cover` is exact; it only crops
 * on an off-ratio dev window.
 */
export function AdLoopScreen({
  ad,
  onOpenHome,
}: {
  ad: TenantAd;
  onOpenHome: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  // Sound up by default, which no browser will grant unconditionally. The PIN
  // tap that got us here is user activation and that is usually enough — but
  // activation is transient, and a session rehydrated on reload carries none at
  // all, in which case `play()` rejects rather than starting silently. Fall
  // back to a muted loop instead of a frozen frame; the control below is then
  // the way back to audio.
  //
  // Playback is started here rather than by an `autoPlay` attribute: autoplay
  // on an unmuted element is refused outright, so the attribute would only ever
  // log a policy error on the way to this same fallback.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      setMuted(true);
      void video.play();
    });
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    // Unmuting outside a user gesture makes Chrome pause the element rather
    // than refuse the change, so resume instead of assuming the loop survived.
    void video.play();
  };

  return (
    // Brand ground rather than black: the spot fades in once it can play, and a
    // few hundred milliseconds of the store's own green reads as the screen
    // waking up. Black reads as a dead panel.
    <div className="@container relative h-full w-full overflow-hidden bg-brand">
      <video
        ref={videoRef}
        src={ad.src}
        loop
        playsInline
        preload="auto"
        aria-hidden
        onCanPlay={() => setReady(true)}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-500",
          ready ? "opacity-100" : "opacity-0",
        )}
      />

      {/* The video carries no accessible content of its own, so name what is
          playing rather than leaving the screen silent to a reader. */}
      <p className="sr-only">Advertisement — {ad.advertiser}, playing on a loop</p>

      {/* The whole panel is the way in. A sibling that covers the frame rather
          than a wrapper around it: the sound control is interactive too, and
          nesting one button inside another is invalid and unreachable by
          keyboard. Ordered first so the later sibling stacks above it. */}
      <button
        type="button"
        onClick={onOpenHome}
        aria-label="Open the store home screen"
        className="absolute inset-0 flex items-end justify-center pb-[6cqw] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset"
      >
        <span className="rounded-full bg-black/45 px-[4cqw] py-[1.8cqw] text-[2.2cqw] font-medium tracking-[0.08em] text-white uppercase backdrop-blur-sm motion-safe:animate-pulse">
          Touch anywhere to begin
        </span>
      </button>

      <button
        type="button"
        onClick={toggleSound}
        aria-label={
          muted
            ? `Unmute the ${ad.advertiser} advertisement`
            : `Mute the ${ad.advertiser} advertisement`
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
