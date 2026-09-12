"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LoaderCircle, Mic, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

import { useVoiceInput } from "@/hooks/use-voice-input";
import {
  MAX_CHAT_TEXT_LENGTH,
  navigationFromMessage,
  textFromMessage,
  toSafeMessages,
} from "@/lib/shopping-agent";
import type { Tenant } from "@/lib/tenants";

/**
 * Push to talk — the only control on the store home screen, and the whole
 * ask-find-pick loop behind it.
 *
 * Three pieces that belong together, so they live in one component: a large
 * bottom-anchored mic target, the full-panel flash of what the shopper
 * actually said, and the answer that flash gives way to. Thumb reach is at the
 * bottom of a 1920-tall panel; both overlays have to be readable from several
 * feet back, so they take the whole screen rather than sitting in a field.
 *
 * A finished transcript is sent straight to `/api/chat`, and where it lands is
 * decided entirely by the server: the agent's `openProductMap` and
 * `openProductDetails` tools execute on the server, and `navigationFromMessage`
 * turns only a completed tool *result* into `/map/<slug>` or `/product/<slug>`.
 * Shopper speech never supplies a URL — a question is text, all the way to the
 * catalog lookup. Anything the tools decline to open is answered in words here
 * instead, which is what keeps "we could not verify a shelf location" from
 * turning into a walk to the wrong aisle.
 *
 * The conversation is held in memory only. This screen has no history UI, and
 * any navigation unmounts the shell — so the next shopper walks up to a fresh
 * panel without a stored transcript to clear.
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

/** How long a spoken answer stays up before the panel returns to its resting
 *  state. This screen is unattended, so an answer that waits for a tap would
 *  leave one shopper's question on the glass for the next one. Long enough to
 *  read a paragraph aloud twice. */
const ANSWER_HOLD_MS = 45_000;

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

/** What the panel owes the shopper once the words have left their mouth. */
type Ask =
  | { phase: "idle" }
  | { phase: "asking"; question: string }
  | { phase: "answered"; question: string; answer: string };

/** Shown when the agent finishes with neither a destination nor a sentence.
 *  Never a stock or location claim — this is the case where we know nothing. */
const NO_ANSWER =
  "I could not find an answer to that. A store team member can help.";

export function PushToTalk({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const {
    status,
    transcript,
    error: voiceError,
    elapsedSeconds,
    maxRecordingSeconds,
    startListening,
    stopListening,
    reset,
  } = useVoiceInput();

  const [ask, setAsk] = React.useState<Ask>({ phase: "idle" });
  // One transcript is one question. `reset` below clears the hook's transcript
  // after the flash, but the send effect can re-run before that lands.
  const askedRef = React.useRef<string | null>(null);
  const handledNavigationCallIds = React.useRef(new Set<string>());

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            tenantId: tenant.id,
            messages: toSafeMessages(messages as UIMessage[]),
          },
        }),
      }),
    [tenant.id],
  );

  const {
    sendMessage,
    status: chatStatus,
    error: chatError,
    clearError,
    stop,
    regenerate,
  } = useChat({
    id: tenant.id,
    transport,
    onFinish: ({ message, isAbort, isDisconnect, isError }) => {
      if (isAbort || isDisconnect || isError) return;
      const command = navigationFromMessage(message);
      if (command && !handledNavigationCallIds.current.has(command.toolCallId)) {
        handledNavigationCallIds.current.add(command.toolCallId);
        // Leaves the kiosk shell for a real route. The overlay stays on its
        // "finding" state underneath rather than flashing an answer first.
        router.push(command.href);
        return;
      }
      setAsk((current) =>
        current.phase === "asking"
          ? {
              phase: "answered",
              question: current.question,
              answer: textFromMessage(message) || NO_ANSWER,
            }
          : current,
      );
    },
  });

  const chatPending = chatStatus === "submitted" || chatStatus === "streaming";
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

  // Ask while the flash plays, so the confirmation and the lookup overlap
  // instead of queueing.
  React.useEffect(() => {
    if (!spoken) return;
    const question = spoken.trim().slice(0, MAX_CHAT_TEXT_LENGTH);
    if (!question || askedRef.current === question) return;
    askedRef.current = question;
    setAsk({ phase: "asking", question });
    void sendMessage({ text: question });
  }, [spoken, sendMessage]);

  React.useEffect(() => {
    if (ask.phase !== "answered") return;
    const clear = setTimeout(() => setAsk({ phase: "idle" }), ANSWER_HOLD_MS);
    return () => clearTimeout(clear);
  }, [ask]);

  React.useEffect(() => () => void stop(), [stop]);

  const dismissAnswer = React.useCallback(() => {
    setAsk({ phase: "idle" });
    clearError();
  }, [clearError]);

  const beginQuestion = React.useCallback(() => {
    askedRef.current = null;
    setAsk({ phase: "idle" });
    clearError();
    void startListening();
  }, [clearError, startListening]);

  const message = recording
    ? `Listening · ${elapsedSeconds} / ${maxRecordingSeconds} seconds`
    : status === "requesting-permission"
      ? "Allow microphone access to speak"
      : status === "transcribing"
        ? "Turning your question into text…"
        : "Tap to ask where something is";

  return (
    <>
      {/* Both overlays position against the screen root, which is `relative` —
          not `fixed`, which would escape the 9:16 panel and paint over the
          backdrop on an off-ratio dev window. Each covers the top nav too:
          this is the whole screen while it is up.

          The answer sits a layer below the flash rather than replacing it, so
          the flash plays its own 2.5s fade out to reveal whatever the lookup
          has reached by then — no swap, no second animation to keep in sync. */}
      {ask.phase !== "idle" ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-[4cqw] bg-background px-[7cqw] text-center"
        >
          <p className="text-[2.3cqw] leading-snug text-muted-foreground">
            “{ask.question}”
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
                  onClick={() => {
                    clearError();
                    setAsk({ phase: "asking", question: ask.question });
                    void regenerate();
                  }}
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
            </>
          ) : ask.phase === "asking" ? (
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
                  answerSize(ask.answer),
                )}
              >
                {ask.answer}
              </p>
              <button
                type="button"
                onClick={dismissAnswer}
                className="rounded-2xl bg-brand px-[6cqw] py-[2.6cqw] text-[2.8cqw] font-semibold text-brand-foreground outline-none focus-visible:ring-[1cqw] focus-visible:ring-brand/50"
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

      <div className="flex shrink-0 flex-col items-center gap-[3.5cqw] px-[6cqw] pb-[10cqw]">
        {voiceError ? (
          <p
            role="alert"
            className="text-center text-[2.2cqw] leading-snug text-destructive"
          >
            {voiceError}
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
            disabled={waiting || chatPending}
            onClick={recording ? stopListening : beginQuestion}
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
