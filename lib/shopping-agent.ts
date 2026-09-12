import type { UIMessage } from "ai";

export const SHOPPING_CHAT_STORAGE_PREFIX = "beacon-box:shopping-chat:v1";
export const MAX_CHAT_MESSAGES = 16;
export const MAX_CHAT_TEXT_LENGTH = 800;
/** Products one answer may offer as buttons. Four fit the panel without a
 *  scroll, and a list longer than that stops being a glance. */
export const MAX_PRODUCT_CHOICES = 4;

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

/** One tappable product in an answer. */
export type ProductChoice = {
  sku: string;
  label: string;
  /** Price, size, stock when it matters, and the aisle. Inventory's words. */
  detail: string;
  sponsored: boolean;
  /**
   * Set only for a product with an editorial screen behind it, which in this
   * demo catalog means NyQuil SEVERE and Lumify. Everything else the store
   * stocks is an inventory row and nothing more: tapping it asks the assistant
   * where it is rather than opening a page that was never written.
   */
  productSlug?: string;
};

export type ChoiceOffer = { toolCallId: string; demo: boolean; choices: ProductChoice[] };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isProductChoice(value: unknown): value is ProductChoice {
  if (typeof value !== "object" || value === null) return false;
  const choice = value as Record<string, unknown>;
  return (
    typeof choice.sku === "string" && choice.sku.length > 0 && choice.sku.length <= 80 &&
    typeof choice.label === "string" && choice.label.trim().length > 0 && choice.label.length <= 120 &&
    typeof choice.detail === "string" && choice.detail.length <= 120 &&
    typeof choice.sponsored === "boolean" &&
    (choice.productSlug === undefined || (typeof choice.productSlug === "string" && SLUG_PATTERN.test(choice.productSlug)))
  );
}

/**
 * Read a list of tappable products out of a finished answer.
 *
 * Held to the same rule as `navigationFromMessage`: a button only exists
 * because a server-executed tool produced it. Every label, price and aisle on
 * one was read back out of inventory inside `offerProductChoices`, so a model
 * that merely writes product names in its reply puts nothing on the glass.
 *
 * `toSafeMessages` strips tool parts before any request, so an offer lives for
 * exactly as long as the answer that carries it — restored history can never
 * put a stale price on a button.
 */
export function choicesFromMessage(message: UIMessage): ChoiceOffer | null {
  for (const part of message.parts) {
    if (part.type !== "tool-offerProductChoices") continue;
    if (part.state !== "output-available" || typeof part.output !== "object" || part.output === null) continue;
    const output = part.output as { offered?: unknown; action?: unknown; demo?: unknown; choices?: unknown };
    if (output.offered !== true || output.action !== "offer-product-choices") continue;
    if (!Array.isArray(output.choices)) continue;
    const choices = output.choices.filter(isProductChoice).slice(0, MAX_PRODUCT_CHOICES);
    if (choices.length < 2) continue;
    return { toolCallId: part.toolCallId, demo: output.demo === true, choices };
  }
  return null;
}
