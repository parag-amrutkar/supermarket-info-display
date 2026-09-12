"use client";

import { LoaderCircle, Mic, Square } from "lucide-react";
import { cn } from "cn";

import type { ShoppingAsk } from "@/hooks/use-shopping-ask";

/**
 * The one control that makes Beacon Box work, at three sizes.
 *
 * Sizes are a closed set of literal class strings rather than a prop the caller
 * interpolates: Tailwind v4 generates utilities by scanning source, so a
 * template-built `size-[${n}cqw]` compiles to nothing at all.
 *
 * - `hero` — the store home screen, where the mic is the whole screen's purpose.
 * - `inline` — a product screen, where it sits below the product in the space
 *   three printed prompts used to occupy.
 * - `overlay` — on top of an answer, so a follow-up question costs one tap
 *   instead of a dismissal and a walk back to the home screen.
 */
const SIZES = {
  hero: {
    button: "size-[34cqw]",
    ring: "size-[34cqw]",
    icon: "size-[14cqw]",
    stop: "size-[11cqw]",
    focus: "focus-visible:ring-[1.5cqw] focus-visible:ring-offset-[1cqw]",
  },
  inline: {
    button: "size-[21cqw]",
    ring: "size-[21cqw]",
    icon: "size-[9cqw]",
    stop: "size-[7cqw]",
    focus: "focus-visible:ring-[1cqw] focus-visible:ring-offset-[0.7cqw]",
  },
  overlay: {
    button: "size-[20cqw]",
    ring: "size-[20cqw]",
    icon: "size-[8.5cqw]",
    stop: "size-[6.5cqw]",
    focus: "focus-visible:ring-[1cqw] focus-visible:ring-offset-[0.7cqw]",
  },
} as const;

export function AskMic({
  ask,
  size,
}: {
  ask: ShoppingAsk;
  size: keyof typeof SIZES;
}) {
  const scale = SIZES[size];
  const { recording, waiting, micDisabled, beginQuestion, stopListening } = ask;

  return (
    <div className="relative grid place-items-center">
      {/* Sonar ring while recording. A sibling rather than a ring utility:
          rings are box-shadows and cannot be scaled independently. */}
      {recording ? (
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full bg-brand/30 motion-safe:animate-ping",
            scale.ring,
          )}
        />
      ) : null}
      <button
        type="button"
        disabled={micDisabled}
        onClick={recording ? stopListening : beginQuestion}
        aria-label={recording ? "Stop listening" : "Tap to speak"}
        className={cn(
          "relative grid place-items-center rounded-full bg-brand text-brand-foreground",
          "shadow-xl transition-transform outline-none",
          "hover:opacity-95 active:scale-95",
          "focus-visible:ring-brand/50",
          "disabled:opacity-60",
          scale.button,
          scale.focus,
        )}
      >
        {waiting ? (
          <LoaderCircle
            aria-hidden
            className={cn("motion-safe:animate-spin", scale.icon)}
          />
        ) : recording ? (
          <Square aria-hidden className={cn("fill-current", scale.stop)} />
        ) : (
          <Mic aria-hidden className={scale.icon} />
        )}
      </button>
    </div>
  );
}
