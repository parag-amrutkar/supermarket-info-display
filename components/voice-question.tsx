"use client";

import { CircleStop, Mic, RotateCcw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceInput } from "@/hooks/use-voice-input";

const COPY = {
  idle: "Tap the microphone and ask your question.",
  "requesting-permission": "Waiting for microphone permission…",
  recording: "Listening… tap Done when you finish.",
  transcribing: "Turning your question into text…",
  success: "Check the question below and make any edits.",
  error: "You can try again or type your question.",
} as const;

export function VoiceQuestion() {
  const voice = useVoiceInput();
  const busy = voice.status === "requesting-permission" || voice.status === "transcribing";
  return (
    <section className="w-full rounded-[2rem] border border-border bg-card p-6 shadow-xl sm:p-9" aria-labelledby="voice-heading">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-primary">Ask. Find. Pick.</p>
        <h1 id="voice-heading" className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">What are you looking for?</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground" aria-live="polite">{COPY[voice.status]}</p>
        <div className="my-8 flex min-h-44 items-center justify-center">
          {voice.status === "recording" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex size-28 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg">
                <span className="absolute inset-0 animate-ping rounded-full bg-destructive/20" aria-hidden="true" />
                <Mic className="relative size-11" aria-hidden="true" />
              </div>
              <span className="font-mono text-lg tabular-nums">0:{String(voice.elapsedSeconds).padStart(2, "0")} / 0:{voice.maxRecordingSeconds}</span>
            </div>
          ) : (
            <Button type="button" onClick={voice.startListening} disabled={busy} className="size-36 rounded-full shadow-xl [&_svg:not([class*='size-'])]:size-12" aria-label={voice.status === "error" ? "Try microphone again" : "Start listening"}>
              {busy ? <RotateCcw className="animate-spin" aria-hidden="true" /> : <Mic aria-hidden="true" />}
            </Button>
          )}
        </div>
        {voice.status === "recording" && (
          <div className="mb-7 flex w-full max-w-md gap-3">
            <Button type="button" size="lg" className="h-14 flex-1 text-base" onClick={voice.stopListening}><CircleStop aria-hidden="true" /> Done</Button>
            <Button type="button" size="lg" variant="outline" className="h-14 flex-1 text-base" onClick={voice.cancelListening}><X aria-hidden="true" /> Cancel</Button>
          </div>
        )}
        {busy && (
          <Button type="button" size="lg" variant="outline" className="mb-7 h-14 w-full max-w-md text-base" onClick={voice.cancelListening}>
            <X aria-hidden="true" /> Cancel
          </Button>
        )}
        {voice.error && <div className="mb-5 w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left text-destructive" role="alert">{voice.error}</div>}
        <div className="w-full text-left">
          <label htmlFor="question" className="mb-2 block text-sm font-semibold">Your question</label>
          <Textarea id="question" value={voice.transcript} onChange={(event) => voice.setTranscript(event.target.value)} disabled={voice.status === "recording" || busy} placeholder="Type here, or use the microphone…" className="min-h-28 resize-none bg-background p-4 text-lg md:text-lg" />
          <div className="mt-4 flex flex-wrap gap-3">
            {voice.status === "error" && voice.canRetry && <Button type="button" variant="secondary" size="lg" className="h-12" onClick={voice.retryTranscription}><RotateCcw aria-hidden="true" /> Retry transcription</Button>}
            {(voice.transcript || voice.status === "error") && <Button type="button" variant="outline" size="lg" className="h-12" onClick={voice.reset}><Square aria-hidden="true" /> Start over</Button>}
          </div>
        </div>
      </div>
    </section>
  );
}
