"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

/**
 * Wayfinding — the route from where the shopper is standing to the product,
 * then the product's place on the shelf.
 *
 * The animation is a pair of rendered MP4s built in `videos/beacon-wayfinding/`
 * rather than live DOM: an intro that plays once (full-frame store plan, the
 * route animated twice, then the shrink into a bottom band) and a seamless
 * loop (the split screen — shelf view above, mini-map below). Both are cut from
 * one 22s composition at frame 360, so the loop picks up exactly where the
 * intro stops and the wrap is one frame of a continuous animation.
 *
 * DEMO DATA, deliberately. Aisle 7 / Bay 3 / top shelf — and the store plan
 * itself — are pixels in the render; there is no product or planogram model
 * behind them yet. The real result map named in `AGENTS.md` would take the
 * product and its location as props and draw the route from live data. This is
 * the screen, not the data layer.
 */

const INTRO_SRC = "/cvs-wayfinding-intro.mp4";
const LOOP_SRC = "/cvs-wayfinding-loop.mp4";

type Directions = {
  aisle: string;
  rack: string;
  shelf: string;
  section: string;
};

export function WayfindingScreen({
  onBack,
  productName,
  directions,
}: {
  onBack: () => void;
  productName?: string;
  directions?: Directions;
}) {
  const [looping, setLooping] = React.useState(false);
  const introRef = React.useRef<HTMLVideoElement>(null);
  const loopRef = React.useRef<HTMLVideoElement>(null);

  // Autoplay is only permitted while muted, and React has historically been
  // unreliable about applying `muted` as a property — so set it directly and
  // start playback here rather than trusting the attribute alone.
  React.useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (loop) loop.muted = true;
    if (intro) {
      intro.muted = true;
      void intro.play();
    }
  }, []);

  const startLoop = () => {
    setLooping(true);
    // Preloaded and decoded already, so this is a visibility swap rather than a
    // load. Swapping `src` on a single element would show a frame of black.
    void loopRef.current?.play();
  };

  return (
    <div className="@container relative h-full w-full overflow-hidden bg-black">
      {/* The panel guarantees 9:16 and the renders are 1080x1920, so `cover`
          fits exactly; it only matters on an off-ratio dev window. */}
      <video
        ref={loopRef}
        src={LOOP_SRC}
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 size-full object-cover"
      />
      <video
        ref={introRef}
        src={INTRO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden
        onEnded={startLoop}
        className={cn(
          "absolute inset-0 size-full object-cover",
          looping && "invisible",
        )}
      />

      {productName && directions ? (
        <div className="absolute top-[4cqw] right-[4cqw] left-[4cqw] rounded-2xl bg-black/70 px-[3cqw] py-[2.4cqw] text-white backdrop-blur-sm">
          <p className="text-[1.7cqw] font-semibold tracking-[0.14em] text-white/75 uppercase">
            Demo inventory location · animation route may not match this product
          </p>
          <p className="mt-[0.6cqw] text-[2.5cqw] leading-tight font-semibold">
            {productName}: {directions.aisle} · {directions.rack} · {directions.shelf}
          </p>
          <p className="mt-[0.5cqw] text-[1.9cqw] text-white/80">{directions.section}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        aria-label="Back to the store screen"
        className="absolute bottom-[5cqw] left-[5cqw] flex items-center gap-[1.5cqw] rounded-full bg-black/55 py-[2cqw] pr-[4cqw] pl-[2.5cqw] text-[2.4cqw] font-medium text-white backdrop-blur-sm transition-colors outline-none hover:bg-black/70 focus-visible:ring-4 focus-visible:ring-white/70"
      >
        <ChevronLeft className="size-[4cqw]" />
        Back
      </button>
    </div>
  );
}
