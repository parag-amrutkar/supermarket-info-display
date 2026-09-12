"use client";

import * as React from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";
import { cn } from "cn";

import { useVoiceInput } from "@/hooks/use-voice-input";

/**
 * Push to talk — the only control on the store home screen.
 *
 * Two pieces that belong together, so they live in one component: a large
 * bottom-anchored mic target, and the full-panel flash of what the shopper
 * actually said. Thumb reach is at the bottom of a 1920-tall panel; the
 * confirmation has to be readable from several feet back, so it takes the
 * whole screen rather than sitting in a field.
 *
 * Activation stays in `useVoiceInput` so a proximity sensor can drive the same
 * actions later without touching this file.
 */

/** Hold before the words start to fade, and the length of the fade. Both are
 *  encoded in the `transcript-flash` keyframes in `globals.css`; these constants
 *  only decide when the transcript is cleared, and must add up to the same
 *  2.5s or the overlay unmounts mid-fade. */
const HOLD_MS = 2000;
const FADE_MS = 500;

/**
 * Type size for the flash, stepped down as the question runs long.
 *
 * `cqw` against the panel, so "huge" means huge at 1080x1920 and at 720x1280
 * alike. A question is a sentence at most — three steps covers the range
 * without a measuring pass.
 */
function transcriptSize(text: string) {
  if (text.length <= 40) return "text-[9cqw]";
  if (text.length <= 90) return "text-[6.5cqw]";
  return "text-[5cqw]";
}

export function PushToTalk() {
  const {
    status,
    transcript,
    error,
    elapsedSeconds,
    maxRecordingSeconds,
    startListening,
    stopListening,
    reset,
  } = useVoiceInput();

  const recording = status === "recording";
  const waiting = status === "requesting-permission" || status === "transcribing";

  // The flash is derived from the hook, never stored: it exists exactly while
  // a finished transcript is held. That keeps hold-and-fade out of React
  // entirely — the timing is one CSS animation, and the only timer here is the
  // one that clears the transcript once the animation has finished playing.
  const spoken = status === "success" && transcript ? transcript : null;

  React.useEffect(() => {
    if (!spoken) return;
    const clear = setTimeout(reset, HOLD_MS + FADE_MS);
    return () => clearTimeout(clear);
  }, [spoken, reset]);

  const message = recording
    ? `Listening · ${elapsedSeconds} / ${maxRecordingSeconds} seconds`
    : status === "requesting-permission"
      ? "Allow microphone access to speak"
      : status === "transcribing"
        ? "Turning your question into text…"
        : "Tap to ask where something is";

  return (
    <>
      {/* Positioned against the screen root, which is `relative` — not `fixed`,
          which would escape the 9:16 panel and paint over the backdrop on an
          off-ratio dev window. Covers the top nav too: this is the whole
          screen, for two and a half seconds. */}
      {spoken ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-50 grid place-items-center bg-brand px-[7cqw] text-brand-foreground animate-transcript-flash"
        >
          <p
            className={cn(
              "text-center leading-[1.08] font-semibold text-balance",
              transcriptSize(spoken),
            )}
          >
            “{spoken}”
          </p>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col items-center gap-[3.5cqw] px-[6cqw] pb-[10cqw]">
        {error ? (
          <p
            role="alert"
            className="text-center text-[2.2cqw] leading-snug text-destructive"
          >
            {error}
          </p>
        ) : null}

        <p
          role="status"
          className="text-center text-[2.6cqw] text-muted-foreground"
        >
          {message}
        </p>

        <div className="relative grid place-items-center">
          {/* Sonar ring while recording. A sibling rather than a ring utility:
              rings are box-shadows and cannot be scaled independently. */}
          {recording ? (
            <span
              aria-hidden
              className="absolute size-[34cqw] rounded-full bg-brand/30 motion-safe:animate-ping"
            />
          ) : null}
          <button
            type="button"
            disabled={waiting}
            onClick={recording ? stopListening : startListening}
            aria-label={recording ? "Stop listening" : "Tap to speak"}
            className={cn(
              "relative grid size-[34cqw] place-items-center rounded-full bg-brand text-brand-foreground",
              "shadow-xl transition-transform outline-none",
              "hover:opacity-95 active:scale-95",
              "focus-visible:ring-[1.5cqw] focus-visible:ring-brand/50 focus-visible:ring-offset-[1cqw]",
              "disabled:opacity-60",
            )}
          >
            {waiting ? (
              <LoaderCircle
                aria-hidden
                className="size-[13cqw] motion-safe:animate-spin"
              />
            ) : recording ? (
              <Square aria-hidden className="size-[11cqw] fill-current" />
            ) : (
              <Mic aria-hidden className="size-[14cqw]" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
