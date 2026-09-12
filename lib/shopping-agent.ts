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
