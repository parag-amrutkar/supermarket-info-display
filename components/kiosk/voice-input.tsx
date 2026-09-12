"use client";

import { useId } from "react";
import { LoaderCircle, Mic, Send, Square, X } from "lucide-react";
import { cn } from "cn";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { MAX_CHAT_TEXT_LENGTH } from "@/lib/shopping-agent";

/** Activation stays in the controller so a sensor can use the same actions. */
export function KioskVoiceInput({
  compact = false,
  disabled = false,
  onSubmit,
}: {
  compact?: boolean;
  disabled?: boolean;
  onSubmit?: (question: string) => void;
}) {
  const voice = useVoiceInput();
  const id = useId();
  const recording = voice.status === "recording";
  const waiting = voice.status === "requesting-permission" || voice.status === "transcribing";
  const active = recording || waiting;
  const control = cn(
    "rounded-xl font-semibold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand/60 disabled:opacity-60",
    compact
      ? "min-h-[7.5cqw] px-[3cqw] py-[1.6cqw] text-[2.3cqw]"
      : "min-h-[9cqw] px-[3cqw] py-[2cqw] text-[2.5cqw]",
  );
  const message = recording
    ? `Listening · ${voice.elapsedSeconds} / ${voice.maxRecordingSeconds} seconds`
    : voice.status === "requesting-permission"
      ? "Allow microphone access to speak."
      : voice.status === "transcribing"
        ? "Turning your question into text…"
        : voice.transcript
          ? "Your words are ready. You can edit them below."
          : "Ask a question, or type it below.";

  return (
    <section
      aria-label="Voice question"
      className={cn(
        "w-full shrink-0 rounded-2xl border border-foreground/15 bg-card/95 text-left",
        compact ? "p-[2.4cqw]" : "p-[3cqw]",
      )}
    >
      <p
        role="status"
        className={cn(
          "text-muted-foreground",
          compact ? "mb-[1.4cqw] text-[2.1cqw]" : "mb-[2cqw] text-[2.4cqw]",
        )}
      >
        {message}
      </p>
      <div className="flex gap-[2cqw]">
        <button
          type="button"
          disabled={waiting || disabled}
          onClick={recording ? voice.stopListening : voice.startListening}
          className={`${control} flex flex-1 items-center justify-center gap-[2cqw] bg-brand text-brand-foreground hover:opacity-90`}
        >
          {waiting ? (
            <LoaderCircle aria-hidden className="size-[4cqw] motion-safe:animate-spin" />
          ) : recording ? (
            <Square aria-hidden className="size-[4cqw]" />
          ) : (
            <Mic aria-hidden className="size-[4cqw]" />
          )}
          {recording ? "Done speaking" : waiting ? "Please wait" : "Tap to speak"}
        </button>
        {active && (
          <button
            type="button"
            onClick={voice.cancelListening}
            className={`${control} flex items-center gap-[1cqw] border border-foreground/20`}
          >
            <X aria-hidden className="size-[3cqw]" />
            Cancel
          </button>
        )}
      </div>
      {voice.error && (
        <p role="alert" className="mt-[2cqw] text-[2.3cqw] text-destructive">
          {voice.error}
        </p>
      )}
      <label
        htmlFor={id}
        className={cn(
          "block font-medium",
          compact
            ? "mt-[2cqw] mb-[0.8cqw] text-[2cqw]"
            : "mt-[3cqw] mb-[1cqw] text-[2.2cqw]",
        )}
      >
        Your question
      </label>
      <textarea
        id={id}
        value={voice.transcript}
        maxLength={MAX_CHAT_TEXT_LENGTH}
        disabled={active || disabled}
        onChange={(event) => voice.setTranscript(event.target.value)}
        placeholder="Where can I find…?"
        rows={compact ? 1 : 2}
        className={cn(
          "block w-full resize-none select-text rounded-xl border border-foreground/20 bg-background p-[2cqw] outline-none focus-visible:ring-4 focus-visible:ring-brand/50 disabled:opacity-60",
          compact ? "min-h-[8cqw] text-[2.5cqw]" : "min-h-[12cqw] text-[2.7cqw]",
        )}
      />
      {!active && (voice.transcript || voice.error) && (
        <div className="mt-[2cqw] flex flex-wrap gap-[2cqw]">
          {voice.status === "error" && voice.canRetry && (
            <button type="button" onClick={voice.retryTranscription} className={`${control} border border-foreground/20`}>
              Retry transcription
            </button>
          )}
          <button type="button" onClick={voice.reset} className={`${control} border border-foreground/20`}>
            Clear question
          </button>
          {onSubmit && voice.transcript.trim() && (
            <button type="button" disabled={disabled} onClick={() => onSubmit(voice.transcript)} className={`${control} flex items-center gap-[1cqw] bg-brand text-brand-foreground hover:opacity-90`}>
              <Send aria-hidden className="size-[3cqw]" />
              Ask Beacon Box
            </button>
          )}
        </div>
      )}
    </section>
  );
}
