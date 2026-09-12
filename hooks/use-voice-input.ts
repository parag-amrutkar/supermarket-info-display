"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RECORDING_MS = 20_000;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];

export type VoiceInputStatus = "idle" | "requesting-permission" | "recording" | "transcribing" | "success" | "error";

function supportedMimeType() {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function microphoneError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone access was blocked. Allow access or type your question below.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found. You can type your question below.";
  }
  return "The microphone could not be started. You can type your question below.";
}

export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const [transcript, setTranscriptState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const statusRef = useRef<VoiceInputStatus>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryAudioRef = useRef<Blob | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef<AbortController | null>(null);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);

  const updateStatus = useCallback((next: VoiceInputStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    stopTimerRef.current = null;
    elapsedTimerRef.current = null;
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const transcribe = useCallback(async (audio: Blob, operation: number) => {
    if (!audio.size) {
      updateStatus("error");
      setError("No audio was captured. Please try again or type your question.");
      return;
    }
    const controller = new AbortController();
    fetchRef.current?.abort();
    fetchRef.current = controller;
    updateStatus("transcribing");
    setError(null);
    const data = new FormData();
    data.append("audio", audio, "question");
    try {
      const response = await fetch("/api/transcribe", { method: "POST", body: data, signal: controller.signal });
      const body = (await response.json().catch(() => ({}))) as { text?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Transcription failed. Please try again.");
      if (typeof body.text !== "string" || !body.text.trim()) throw new Error("We did not hear a question. Please try again.");
      if (mountedRef.current && operation === operationRef.current) {
        setTranscriptState(body.text.trim());
        retryAudioRef.current = null;
        setCanRetry(false);
        updateStatus("success");
      }
    } catch (caught) {
      if (mountedRef.current && operation === operationRef.current && !(caught instanceof DOMException && caught.name === "AbortError")) {
        updateStatus("error");
        setError(caught instanceof Error ? caught.message : "Transcription failed. Please try again.");
      }
    } finally {
      if (fetchRef.current === controller) fetchRef.current = null;
    }
  }, [updateStatus]);

  const startListening = useCallback(async () => {
    if (["requesting-permission", "recording", "transcribing"].includes(statusRef.current)) return;
    const operation = ++operationRef.current;
    fetchRef.current?.abort();
    retryAudioRef.current = null;
    setCanRetry(false);
    setElapsedSeconds(0);
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      updateStatus("error");
      setError("Audio recording is not supported in this browser. Type your question below.");
      return;
    }
    updateStatus("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, echoCancellation: true, noiseSuppression: true } });
      if (!mountedRef.current || operation !== operationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const sessionChunks: Blob[] = [];
      const mimeType = supportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (operation !== operationRef.current) return;
        if (event.data.size) sessionChunks.push(event.data);
      };
      recorder.onerror = () => {
        if (operation !== operationRef.current) return;
        recorder.onstop = null;
        recorder.ondataavailable = null;
        if (recorder.state === "recording") recorder.stop();
        clearTimers();
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        updateStatus("error");
        setError("Recording failed. Please try again or type your question.");
      };
      recorder.onstop = () => {
        if (!mountedRef.current || operation !== operationRef.current) return;
        clearTimers();
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        if (recorderRef.current === recorder) recorderRef.current = null;
        const audio = new Blob(sessionChunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        retryAudioRef.current = audio;
        setCanRetry(Boolean(audio.size));
        void transcribe(audio, operation);
      };
      recorder.start(250);
      updateStatus("recording");
      elapsedTimerRef.current = setInterval(() => setElapsedSeconds((seconds) => Math.min(seconds + 1, 20)), 1000);
      stopTimerRef.current = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, MAX_RECORDING_MS);
    } catch (caught) {
      if (mountedRef.current && operation === operationRef.current) {
        stopTracks();
        updateStatus("error");
        setError(microphoneError(caught));
      }
    }
  }, [clearTimers, stopTracks, transcribe, updateStatus]);

  const stopListening = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      clearTimers();
      recorderRef.current.stop();
    }
  }, [clearTimers]);

  const cancelListening = useCallback(() => {
    ++operationRef.current;
    clearTimers();
    fetchRef.current?.abort();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.ondataavailable = null;
      recorder.stop();
    }
    recorderRef.current = null;
    retryAudioRef.current = null;
    setCanRetry(false);
    stopTracks();
    setElapsedSeconds(0);
    updateStatus("idle");
    setError(null);
  }, [clearTimers, stopTracks, updateStatus]);

  const reset = useCallback(() => {
    cancelListening();
    retryAudioRef.current = null;
    setCanRetry(false);
    setTranscriptState("");
  }, [cancelListening]);

  const retryTranscription = useCallback(() => {
    if (!retryAudioRef.current || statusRef.current === "transcribing") return;
    void transcribe(retryAudioRef.current, ++operationRef.current);
  }, [transcribe]);

  const setTranscript = useCallback((value: string) => {
    if (["requesting-permission", "recording", "transcribing"].includes(statusRef.current)) return;
    setTranscriptState(value);
    setError(null);
    updateStatus(value.trim() ? "success" : "idle");
  }, [updateStatus]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // The generation bump invalidates permission, recorder, and fetch callbacks.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++operationRef.current;
      clearTimers();
      fetchRef.current?.abort();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.onerror = null;
        recorderRef.current.ondataavailable = null;
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
      statusRef.current = "idle";
    };
  }, [clearTimers]);

  return { status, transcript, error, elapsedSeconds, maxRecordingSeconds: 20, canRetry, startListening, stopListening, cancelListening, retryTranscription, reset, setTranscript };
}
