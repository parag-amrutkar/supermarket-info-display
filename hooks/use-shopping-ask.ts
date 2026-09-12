"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";

import { useVoiceInput } from "@/hooks/use-voice-input";
import {
  type ChoiceOffer,
  choicesFromMessage,
  MAX_CHAT_TEXT_LENGTH,
  navigationFromMessage,
  type ProductChoice,
  textFromMessage,
  toSafeMessages,
} from "@/lib/shopping-agent";

/**
 * The ask-find-pick loop, with no opinion about what the microphone looks like.
 *
 * Two screens speak: the store home screen (one huge bottom-anchored mic) and a
 * product screen (a smaller mic where three printed prompts used to sit). The
 * capture, the lookup, where the answer lands, and the hold-then-clear timers
 * are identical on both, so they live here and each screen supplies only its
 * own mic and copy.
 *
 * A finished transcript is sent straight to `/api/chat`, and where it lands is
 * decided entirely by the server: the agent's `openProductMap` and
 * `openProductDetails` tools execute on the server, and `navigationFromMessage`
 * turns only a completed tool *result* into `/map/<slug>` or `/product/<slug>`.
 * Shopper speech never supplies a URL — a question is text, all the way to the
 * catalog lookup. Anything the tools decline to open is answered in words
 * instead, which is what keeps "we could not verify a shelf location" from
 * turning into a walk to the wrong aisle.
 *
 * A question that matches a kind of product rather than one — "cold medicine",
 * "eye drops" — comes back with a list attached instead of a destination. That
 * list is built by a third server tool, `offerProductChoices`, which re-reads
 * every SKU out of inventory before it will put a price or an aisle on a button;
 * `choicesFromMessage` turns only its completed result into tap targets. A
 * product with an editorial screen behind it opens that screen, and the rest of
 * the store's inventory becomes a follow-up question — see `chooseProduct`.
 *
 * The conversation is held in memory only. Neither screen has history UI, and
 * any navigation unmounts the caller — so the next shopper walks up to a fresh
 * panel with no stored transcript to clear.
 *
 * Activation stays in `useVoiceInput` so a proximity sensor can drive the same
 * actions later without touching a screen.
 */

/** Hold before the words start to fade, and the length of the fade. Both are
 *  encoded in the `transcript-flash` keyframes in `globals.css`; these constants
 *  only decide when the transcript is cleared, and must add up to the same
 *  2.5s or the overlay unmounts mid-fade. */
const HOLD_MS = 2000;
const FADE_MS = 500;

/** How long a spoken answer stays up before the panel returns to its resting
 *  state. These screens are unattended, so an answer that waits for a tap would
 *  leave one shopper's question on the glass for the next one. Long enough to
 *  read a paragraph aloud twice. */
const ANSWER_HOLD_MS = 45_000;

/** Longer when the answer is a list of products. Four names, prices and aisles
 *  take longer to scan than a sentence takes to read, and a panel that clears
 *  itself from under a shopper mid-decision is worse than one that waits. */
const CHOICE_HOLD_MS = 75_000;

/** Shown when the agent finishes with neither a destination nor a sentence.
 *  Never a stock or location claim — this is the case where we know nothing. */
export const NO_ANSWER =
  "I could not find an answer to that. A store team member can help.";

/** What the panel owes the shopper once the words have left their mouth. */
export type Ask =
  | { phase: "idle" }
  | { phase: "asking"; question: string }
  | {
      phase: "answered";
      question: string;
      answer: string;
      /**
       * The products this answer put on the glass as buttons, when the question
       * matched several rather than one. Null for an ordinary spoken answer.
       */
      offer: ChoiceOffer | null;
    };

export type ShoppingAsk = ReturnType<typeof useShoppingAsk>;

export function useShoppingAsk({
  tenantId,
  /**
   * The product screen the shopper is standing at, when they are on one.
   *
   * Two jobs, both server-side: it puts that product's authored answer bank in
   * front of the agent so "will this make me drowsy?" is answerable without a
   * named product, and it stops the agent re-opening the page already on screen.
   */
  productSlug,
  /** Mic copy at rest. The only string that differs between the two screens. */
  idlePrompt,
}: {
  tenantId: string;
  productSlug?: string;
  idlePrompt: string;
}) {
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
            tenantId,
            productSlug,
            messages: toSafeMessages(messages as UIMessage[]),
          },
        }),
      }),
    [productSlug, tenantId],
  );

  const {
    sendMessage,
    status: chatStatus,
    error: chatError,
    clearError,
    stop,
    regenerate,
  } = useChat({
    id: productSlug ? `${tenantId}:${productSlug}` : tenantId,
    transport,
    onFinish: ({ message, isAbort, isDisconnect, isError }) => {
      if (isAbort || isDisconnect || isError) return;
      const command = navigationFromMessage(message);
      if (command && !handledNavigationCallIds.current.has(command.toolCallId)) {
        handledNavigationCallIds.current.add(command.toolCallId);
        // Leaves for a real route. The overlay stays on its "finding" state
        // underneath rather than flashing an answer first.
        router.push(command.href);
        return;
      }
      const offer = choicesFromMessage(message);
      setAsk((current) =>
        current.phase === "asking"
          ? {
              phase: "answered",
              question: current.question,
              // A list of buttons is an answer on its own, so a silent model
              // does not get the "I could not find that" line over the top of
              // four products the shopper can see.
              answer: textFromMessage(message) || (offer ? "" : NO_ANSWER),
              offer,
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
    const clear = setTimeout(() => setAsk({ phase: "idle" }), ask.offer ? CHOICE_HOLD_MS : ANSWER_HOLD_MS);
    return () => clearTimeout(clear);
  }, [ask]);

  React.useEffect(() => () => void stop(), [stop]);

  const dismissAnswer = React.useCallback(() => {
    setAsk({ phase: "idle" });
    clearError();
  }, [clearError]);

  /** Tapping the mic from an answer overlay takes the overlay down and starts
   *  recording behind it, so the screen's own mic carries the listening state
   *  rather than two places showing it. */
  const beginQuestion = React.useCallback(() => {
    askedRef.current = null;
    setAsk({ phase: "idle" });
    clearError();
    void startListening();
  }, [clearError, startListening]);

  const retryAnswer = React.useCallback(() => {
    if (ask.phase === "idle") return;
    clearError();
    setAsk({ phase: "asking", question: ask.question });
    void regenerate();
  }, [ask, clearError, regenerate]);

  /**
   * A tap on one of the offered products.
   *
   * Two outcomes, decided by the server when it built the list: a product with
   * an editorial screen opens it, and everything else the store stocks becomes
   * the follow-up question the shopper was about to ask anyway. Nothing on that
   * list is a dead button, and nothing invents a page that was never written.
   */
  const chooseProduct = React.useCallback(
    (choice: ProductChoice) => {
      if (chatPending) return;
      if (choice.productSlug) {
        router.push(`/product/${choice.productSlug}`);
        return;
      }
      const question = `Where can I find ${choice.label}?`;
      clearError();
      setAsk({ phase: "asking", question });
      void sendMessage({ text: question.slice(0, MAX_CHAT_TEXT_LENGTH) });
    },
    [chatPending, clearError, router, sendMessage],
  );

  const micMessage = recording
    ? `Listening · ${elapsedSeconds} / ${maxRecordingSeconds} seconds`
    : status === "requesting-permission"
      ? "Allow microphone access to speak"
      : status === "transcribing"
        ? "Turning your question into text…"
        : idlePrompt;

  return {
    ask,
    spoken,
    chatError,
    chatPending,
    recording,
    waiting,
    voiceError,
    micMessage,
    /** Tapping the mic is a no-op while the last question is still in flight. */
    micDisabled: waiting || chatPending,
    beginQuestion,
    stopListening,
    dismissAnswer,
    retryAnswer,
    chooseProduct,
  };
}
