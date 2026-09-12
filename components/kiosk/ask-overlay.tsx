"use client";

import { ChevronRight, LoaderCircle, MapPin } from "lucide-react";
import { cn } from "cn";

import { AskMic } from "@/components/kiosk/ask-mic";
import type { ShoppingAsk } from "@/hooks/use-shopping-ask";
import type { ChoiceOffer, ProductChoice } from "@/lib/shopping-agent";

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
 *
 * An answer to a question that matched several products — "cold medicine", "eye
 * drops" — arrives with those products attached, and they render as buttons
 * rather than as a list in the sentence. A spoken list is unusable at a kiosk:
 * by the fourth name the first is gone, and the shopper has nothing to point at.
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
 *  one, so it starts lower and steps further down.
 *
 *  An answer that introduces a list of buttons gives up the top step: the
 *  products underneath are what the shopper is reading, and a sentence set
 *  larger than them would fight for that. */
function answerSize(text: string, compact: boolean) {
  if (text.length <= 80) return compact ? "text-[3.4cqw]" : "text-[5cqw]";
  if (text.length <= 200) return compact ? "text-[3cqw]" : "text-[3.8cqw]";
  return "text-[3cqw]";
}

export function AskOverlay({ ask }: { ask: ShoppingAsk }) {
  const { ask: state, chatError, spoken, chooseProduct, dismissAnswer, retryAnswer } = ask;
  const offer = state.phase === "answered" ? state.offer : null;

  return (
    <>
      {state.phase !== "idle" ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "absolute inset-0 z-40 flex flex-col items-center justify-center bg-background px-[7cqw] text-center",
            // A list of products is several tap targets taller than a sentence;
            // the gap closes up rather than letting the Done button fall off.
            offer ? "gap-[3cqw] overflow-y-auto py-[6cqw]" : "gap-[4cqw]",
          )}
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
              {state.answer ? (
                <p
                  className={cn(
                    "leading-snug font-semibold text-balance whitespace-pre-wrap",
                    answerSize(state.answer, offer !== null),
                  )}
                >
                  {state.answer}
                </p>
              ) : null}
              {offer ? <ChoiceList offer={offer} onChoose={chooseProduct} /> : null}
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

/**
 * The products an answer offers, as tap targets.
 *
 * Two kinds, and the difference is deliberately visible before the tap rather
 * than discovered after it. A filled brand row has a written product screen
 * behind it and opens straight into it; an outlined row is a product the store
 * stocks and nothing more, so tapping it asks the assistant where it is. The
 * store carries a hundred products and two of them have been written up, which
 * is the honest shape of any real catalog — a kiosk that hid the other ninety
 * eight would be lying about what is on the shelf.
 */
function ChoiceList({
  offer,
  onChoose,
}: {
  offer: ChoiceOffer;
  onChoose: (choice: ProductChoice) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[1.6cqw]">
      <ul className="flex w-full flex-col gap-[1.8cqw]">
        {offer.choices.map((choice) => (
          <li key={choice.sku}>
            <Choice choice={choice} onChoose={onChoose} />
          </li>
        ))}
      </ul>
      {offer.demo ? (
        <p className="text-[1.8cqw] text-muted-foreground">
          Demo inventory · prices and stock are simulated.
        </p>
      ) : null}
    </div>
  );
}

function Choice({
  choice,
  onChoose,
}: {
  choice: ProductChoice;
  onChoose: (choice: ProductChoice) => void;
}) {
  const opens = choice.productSlug !== undefined;

  return (
    <button
      type="button"
      onClick={() => onChoose(choice)}
      aria-label={`${choice.label}. ${choice.detail}. ${
        opens ? "Open this product" : "Ask where this is"
      }`}
      className={cn(
        "flex w-full items-center gap-[2.5cqw] rounded-2xl px-[3.5cqw] py-[2.4cqw] text-left",
        "outline-none transition-transform active:scale-[0.98]",
        "focus-visible:ring-[1cqw] focus-visible:ring-brand/50",
        opens
          ? "bg-brand text-brand-foreground"
          : "border border-foreground/25 bg-background",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-[1.2cqw]">
          <span className="text-[2.6cqw] leading-snug font-semibold">
            {choice.label}
          </span>
          {/* Sponsored placement is named on the button itself, not in a
              footnote — AGENTS.md asks for the distinction where the shopper
              makes the choice. */}
          {choice.sponsored ? (
            <span
              className={cn(
                "rounded-full px-[1.4cqw] py-[0.4cqw] text-[1.6cqw] font-semibold tracking-wide uppercase",
                opens
                  ? "bg-brand-foreground/20 text-brand-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              Sponsored
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "mt-[0.6cqw] block text-[2cqw]",
            opens ? "text-brand-foreground/80" : "text-muted-foreground",
          )}
        >
          {choice.detail}
        </span>
      </span>
      {opens ? (
        <ChevronRight aria-hidden className="size-[4cqw] shrink-0" />
      ) : (
        <MapPin aria-hidden className="size-[3.4cqw] shrink-0 opacity-60" />
      )}
    </button>
  );
}
