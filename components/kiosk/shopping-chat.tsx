"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LoaderCircle, RotateCcw, Send, Square } from "lucide-react";

import { KioskVoiceInput } from "@/components/kiosk/voice-input";
import { chatStorageKey, isStoredChat, MAX_CHAT_MESSAGES, MAX_CHAT_TEXT_LENGTH, textFromMessage } from "@/lib/shopping-agent";
import type { DemoSession } from "@/lib/demo-auth";
import type { Tenant } from "@/lib/tenants";

function newConversationId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function activeConversationKey(tenantId: string, signedInAt: number) {
  return `beacon-box:shopping-chat:v1:active:${tenantId}:${signedInAt}`;
}

function loadConversation(key: string): UIMessage[] {
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? "null");
    return isStoredChat(stored) ? stored : [];
  } catch {
    return [];
  }
}

function toSafeMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      const text = textFromMessage(message).slice(0, MAX_CHAT_TEXT_LENGTH);
      return { id: message.id, role: message.role, parts: text ? [{ type: "text" as const, text }] : [] };
    })
    .filter((message) => message.parts.length > 0)
    .slice(-MAX_CHAT_MESSAGES);
}

function persistConversation(key: string, messages: UIMessage[]) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(toSafeMessages(messages)));
  } catch {
    // Storage can be unavailable in private or locked-down kiosk browser modes.
  }
}

function MessageText({ message }: { message: UIMessage }) {
  const text = textFromMessage(message);
  if (!text) return null;
  return <div className={message.role === "user" ? "rounded-xl bg-brand px-[2cqw] py-[1.4cqw] text-brand-foreground" : "rounded-xl bg-muted px-[2cqw] py-[1.4cqw]"}>{text}</div>;
}

function Conversation({ tenant, storageKey, onNewConversation }: { tenant: Tenant; storageKey: string; onNewConversation: (oldStorageKey: string) => void }) {
  const initialMessages = React.useMemo(() => loadConversation(storageKey), [storageKey]);
  const transport = React.useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({ body: { tenantId: tenant.id, messages: toSafeMessages(messages as UIMessage[]) } }),
    }),
    [tenant.id],
  );
  const { messages, sendMessage, setMessages, status, error, stop, clearError, regenerate } = useChat({ id: storageKey, messages: initialMessages, transport });
  const pending = status === "submitted" || status === "streaming";
  const pendingRef = React.useRef(false);
  const historyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { persistConversation(storageKey, messages); }, [messages, storageKey]);
  React.useEffect(() => () => { void stop(); }, [stop]);
  React.useEffect(() => { if (!pending) pendingRef.current = false; }, [pending]);
  React.useEffect(() => { historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight }); }, [messages, pending]);

  const submit = React.useCallback((question: string) => {
    const text = question.trim();
    if (!text || pendingRef.current) return;
    pendingRef.current = true;
    clearError();
    void sendMessage({ text: text.slice(0, MAX_CHAT_TEXT_LENGTH) });
  }, [clearError, sendMessage]);

  const retry = React.useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    clearError();
    void regenerate();
  }, [clearError, regenerate]);

  const startNewConversation = React.useCallback(() => {
    void stop();
    pendingRef.current = false;
    setMessages([]);
    clearError();
    onNewConversation(storageKey);
  }, [clearError, onNewConversation, setMessages, stop, storageKey]);

  return (
    <section aria-label="Shopping assistant" className="flex min-h-0 flex-col gap-[2cqw]">
      <div className="flex items-center justify-between gap-[2cqw]">
        <div><h2 className="text-[2.8cqw] font-semibold">Ask Beacon Box</h2><p className="text-[1.8cqw] text-muted-foreground">Find products, stock, and shelf locations.</p></div>
        <button type="button" onClick={startNewConversation} className="flex shrink-0 items-center gap-[0.8cqw] rounded-xl border border-foreground/20 px-[1.7cqw] py-[1.1cqw] text-[1.8cqw] font-medium outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-brand/50"><RotateCcw className="size-[2.2cqw]" aria-hidden />New chat</button>
      </div>
      <p className="text-[1.8cqw] text-muted-foreground">
        {tenant.id === "cvs-2841"
          ? "Demo inventory · Stock and prices are simulated."
          : "Inventory is not connected for this store."}
      </p>
      {messages.length > 0 && <div ref={historyRef} aria-live="polite" className="max-h-[32cqw] space-y-[1.4cqw] overflow-y-auto rounded-xl border border-foreground/15 bg-background/60 p-[1.5cqw] text-[2cqw] leading-snug whitespace-pre-wrap">{messages.map((message) => <MessageText key={message.id} message={message} />)}{pending && <p className="flex items-center gap-[1cqw] text-muted-foreground"><LoaderCircle className="size-[2.4cqw] animate-spin" aria-hidden /> Finding an answer…</p>}</div>}
      <KioskVoiceInput key={storageKey} onSubmit={submit} disabled={pending} />
      {pending && <button type="button" onClick={() => void stop()} className="flex w-fit items-center gap-[0.8cqw] rounded-xl border border-foreground/20 px-[2cqw] py-[1.2cqw] text-[2cqw] font-medium outline-none focus-visible:ring-4 focus-visible:ring-brand/50"><Square className="size-[2.4cqw]" aria-hidden /> Stop answer</button>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-[1.5cqw] rounded-xl border border-destructive/30 bg-destructive/10 p-[1.7cqw] text-[1.9cqw] text-destructive"><span>{error.message || "Beacon Box could not answer that. Please try again."}</span><button type="button" onClick={retry} className="flex items-center gap-[0.7cqw] rounded-lg border border-current px-[1.4cqw] py-[0.8cqw] font-medium"><Send className="size-[2cqw]" aria-hidden /> Retry</button></div>}
    </section>
  );
}

export function ShoppingChat({ tenant, session }: { tenant: Tenant; session: DemoSession }) {
  const activeKey = activeConversationKey(tenant.id, session.signedInAt);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(activeKey);
      const id = saved && /^[a-zA-Z0-9-]{8,128}$/.test(saved) ? saved : newConversationId();
      window.sessionStorage.setItem(activeKey, id);
      // Restore browser-only storage after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversationId(id);
    } catch {
      setConversationId(newConversationId());
    }
  }, [activeKey]);
  const startNewConversation = React.useCallback((oldStorageKey: string) => {
    const next = newConversationId();
    try {
      window.sessionStorage.removeItem(oldStorageKey);
      window.sessionStorage.setItem(activeKey, next);
    } catch { /* in-memory state still resets */ }
    setConversationId(next);
  }, [activeKey]);
  if (!conversationId) return <section aria-label="Shopping assistant" className="rounded-xl border border-foreground/15 p-[3cqw] text-[2cqw] text-muted-foreground">Loading assistant…</section>;
  const storageKey = chatStorageKey(tenant.id, session.signedInAt, conversationId);
  return <Conversation key={storageKey} tenant={tenant} storageKey={storageKey} onNewConversation={startNewConversation} />;
}
