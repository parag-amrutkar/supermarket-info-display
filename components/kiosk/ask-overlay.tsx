"use client";

import { LoaderCircle } from "lucide-react";
import { cn } from "cn";

import { AskMic } from "@/components/kiosk/ask-mic";
import type { ShoppingAsk } from "@/hooks/use-shopping-ask";

/**
 * Everything a spoken question puts on the glass: the full-panel flash of what
 * the shopper actually said, and the answer it gives way to.
 *
 * Both position against the nearest positioned ancestor, which every caller
 * makes its own screen root — not `fixed`, which would escape the 9:16 panel and
 * paint over the backdrop on an off-ratio dev window. Each covers the tenant
 * chrome too: this is the whole screen while it is up. A caller must therefore
 * render this *outside* any `overflow-hidden` content column, or the popup is
 * clipped to it.
 *
 * The answer sits a layer below the flash rather than replacing it, so the flash
 * plays its own 2.5s fade out to reveal whatever the lookup has reached by then
 * — no swap, no second animation to keep in sync.
 *
 * The mic repeats inside the answer, because the next thing a shopper does after
 * reading one answer is ask the follow-up. Tapping it takes the popup down and
 * starts recording behind it, so the screen's own mic carries the listening
 * state rather than two places showing it at once.
 */

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

/** The same treatment for an answer, which runs several sentences rather than
 *  one, so it starts lower and steps further down. */
function answerSize(text: string) {
  if (text.length <= 80) return "text-[5cqw]";
  if (text.length <= 200) return "text-[3.8cqw]";
  return "text-[3cqw]";
}

export function AskOverlay({ ask }: { ask: ShoppingAsk }) {
  const { ask: state, chatError, spoken, dismissAnswer, retryAnswer } = ask;

  return (
    <>
      {state.phase !== "idle" ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-[4cqw] bg-background px-[7cqw] text-center"
        >
          <p className="text-[2.3cqw] leading-snug text-muted-foreground">
            “{state.question}”
          </p>

          {chatError ? (
            <>
              <p
                role="alert"
                className="text-[3.4cqw] leading-snug font-semibold text-balance text-destructive"
              >
                {chatError.message ||
                  "Beacon Box could not finish the answer. Please try again."}
              </p>
              <div className="flex flex-wrap justify-center gap-[3cqw]">
                <button
                  type="button"
                  onClick={retryAnswer}
                  className="rounded-2xl bg-brand px-[5cqw] py-[2.4cqw] text-[2.8cqw] font-semibold text-brand-foreground outline-none focus-visible:ring-[1cqw] focus-visible:ring-brand/50"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={dismissAnswer}
                  className="rounded-2xl border border-foreground/25 px-[5cqw] py-[2.4cqw] text-[2.8cqw] font-semibold outline-none focus-visible:ring-[1cqw] focus-visible:ring-brand/50"
                >
                  Done
                </button>
              </div>
              <AskAgain ask={ask} />
            </>
          ) : state.phase === "asking" ? (
            <p className="flex items-center gap-[2.5cqw] text-[3.6cqw] font-semibold">
              <LoaderCircle
                aria-hidden
                className="size-[5cqw] motion-safe:animate-spin"
              />
              Finding an answer…
            </p>
          ) : (
            <>
              <p
                className={cn(
                  "leading-snug font-semibold text-balance whitespace-pre-wrap",
                  answerSize(state.answer),
                )}
              >
                {state.answer}
              </p>
              <AskAgain ask={ask} />
              <button
                type="button"
                onClick={dismissAnswer}
                className="rounded-2xl border border-foreground/25 px-[6cqw] py-[2.2cqw] text-[2.6cqw] font-semibold outline-none focus-visible:ring-[1cqw] focus-visible:ring-brand/50"
              >
                Done
              </button>
            </>
          )}
        </div>
      ) : null}

      {spoken ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-50 grid animate-transcript-flash place-items-center bg-brand px-[7cqw] text-brand-foreground"
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
    </>
  );
}

/** The mic, captioned so the tap target reads as an invitation rather than a
 *  decoration. Same component and the same brand fill as the screen underneath,
 *  so it is recognisably the same control in a second place. */
function AskAgain({ ask }: { ask: ShoppingAsk }) {
  return (
    <div className="flex flex-col items-center gap-[2cqw]">
      <AskMic ask={ask} size="overlay" />
      <p className="text-[2.2cqw] text-muted-foreground">
        Tap to ask another question
      </p>
    </div>
  );
}
