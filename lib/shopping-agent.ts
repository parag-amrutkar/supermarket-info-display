import type { UIMessage } from "ai";

export const SHOPPING_CHAT_STORAGE_PREFIX = "beacon-box:shopping-chat:v1";
export const MAX_CHAT_MESSAGES = 16;
export const MAX_CHAT_TEXT_LENGTH = 800;

export type ShoppingTenantId = "cvs-2841" | "sunrise-deli";

export type StoreContext =
  | { tenantId: "cvs-2841"; storeId: "CVS-DEMO-001"; inventoryAvailable: true }
  | { tenantId: "sunrise-deli"; storeId: null; inventoryAvailable: false };

/** Inventory is intentionally only configured for the CVS demo store. */
export function getStoreContext(tenantId: string): StoreContext | null {
  if (tenantId === "cvs-2841") {
    return { tenantId, storeId: "CVS-DEMO-001", inventoryAvailable: true };
  }
  if (tenantId === "sunrise-deli") {
    return { tenantId, storeId: null, inventoryAvailable: false };
  }
  return null;
}

export function chatStorageKey(tenantId: string, staffSessionStartedAt: number, conversationId: string): string {
  return `${SHOPPING_CHAT_STORAGE_PREFIX}:${tenantId}:${staffSessionStartedAt}:${conversationId}`;
}

export function clearShoppingChat(tenantId: string, staffSessionStartedAt: number): void {
  if (typeof window === "undefined") return;
  const activeKey = `${SHOPPING_CHAT_STORAGE_PREFIX}:active:${tenantId}:${staffSessionStartedAt}`;
  try {
    const conversationId = window.sessionStorage.getItem(activeKey);
    if (conversationId) window.sessionStorage.removeItem(chatStorageKey(tenantId, staffSessionStartedAt, conversationId));
    window.sessionStorage.removeItem(activeKey);
  } catch {
    // A locked-down browser may refuse storage access; the in-memory component still unmounts.
  }
}

/** Extract only completed, plain conversational text before retaining it. */
export function textFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

/**
 * Strip a conversation down to the completed plain text the chat API accepts.
 *
 * Tool parts, reasoning, and partial streams are all dropped: the route
 * validates messages as text-only, and a navigation destination must come from
 * a fresh server-executed tool call rather than from replayed history.
 */
export function toSafeMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      const text = textFromMessage(message).slice(0, MAX_CHAT_TEXT_LENGTH);
      return { id: message.id, role: message.role, parts: text ? [{ type: "text" as const, text }] : [] };
    })
    .filter((message) => message.parts.length > 0)
    .slice(-MAX_CHAT_MESSAGES);
}

export function isStoredChat(value: unknown): value is UIMessage[] {
  if (!Array.isArray(value) || value.length > MAX_CHAT_MESSAGES) return false;
  return value.every((message) => {
    if (typeof message !== "object" || message === null) return false;
    const candidate = message as Partial<UIMessage>;
    return (
      typeof candidate.id === "string" &&
      candidate.id.length > 0 && candidate.id.length <= 128 &&
      (candidate.role === "user" || candidate.role === "assistant") &&
      Array.isArray(candidate.parts) &&
      candidate.parts.length === 1 &&
      candidate.parts.every(
        (part) =>
          typeof part === "object" &&
          part !== null &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string" &&
          (part as { text: string }).text.trim().length > 0 &&
          (part as { text: string }).text.length <= MAX_CHAT_TEXT_LENGTH,
      )
    );
  });
}

export type NavigationCommand = { toolCallId: string; href: string };

/**
 * Derive a route only from a completed, server-executed navigation result.
 * Shopper text and restored chat history never supply a destination URL.
 */
export function navigationFromMessage(message: UIMessage): NavigationCommand | null {
  for (const part of message.parts) {
    if (part.type !== "tool-openProductDetails" && part.type !== "tool-openProductMap") continue;
    if (part.state !== "output-available" || typeof part.output !== "object" || part.output === null) continue;
    const output = part.output as { opened?: unknown; action?: unknown; productSlug?: unknown };
    const expectedAction = part.type === "tool-openProductDetails" ? "open-product-details" : "open-product-map";
    if (
      output.opened !== true ||
      output.action !== expectedAction ||
      typeof output.productSlug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(output.productSlug)
    ) continue;
    return {
      toolCallId: part.toolCallId,
      href: expectedAction === "open-product-details" ? `/product/${output.productSlug}` : `/map/${output.productSlug}`,
    };
  }
  return null;
}
