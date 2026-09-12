"use client";

import * as React from "react";

import { AskMic } from "@/components/kiosk/ask-mic";
import { AskOverlay } from "@/components/kiosk/ask-overlay";
import { type ShoppingAsk, useShoppingAsk } from "@/hooks/use-shopping-ask";

/**
 * The microphone on a product screen, and the popup its answers arrive in.
 *
 * Replaces three printed prompts ("Other versions?", "Other brands?", "Product
 * questions?") that advertised topics but could not be tapped. A shopper reading
 * a label wants to ask about *this* product in their own words, so the screen
 * now offers the same control the home screen does, and the answer comes back in
 * the same full-panel popup a spoken question gets anywhere else.
 *
 * `productSlug` goes to the server with every question. That is what lets "will
 * this make me drowsy?" be answered with no product named: the route puts this
 * product's authored answer bank in front of the agent, and stops it re-opening
 * the page already on screen.
 *
 * Split in two because of where each half has to render. The popup covers the
 * whole panel, so it cannot live inside the screen's `overflow-hidden` content
 * column — `ProductAsk` wraps the screen and owns the popup, `ProductAskMic`
 * sits down in the column and reads the same state through context.
 */

const AskContext = React.createContext<ShoppingAsk | null>(null);

export function ProductAsk({
  tenantId,
  productSlug,
  className,
  style,
  children,
}: {
  tenantId: string;
  productSlug: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ask = useShoppingAsk({
    tenantId,
    productSlug,
    idlePrompt: "Tap to ask about this product",
  });

  return (
    <AskContext.Provider value={ask}>
      <div className={className} style={style}>
        {children}
        <AskOverlay ask={ask} />
      </div>
    </AskContext.Provider>
  );
}

export function ProductAskMic() {
  const ask = React.useContext(AskContext);
  if (!ask) throw new Error("ProductAskMic must be rendered inside ProductAsk");

  return (
    <div className="flex shrink-0 flex-col items-center gap-[2cqw] px-[5cqw] pb-[1.5cqw]">
      {ask.voiceError ? (
        <p
          role="alert"
          className="text-center text-[2cqw] leading-snug text-destructive"
        >
          {ask.voiceError}
        </p>
      ) : null}

      <p
        role="status"
        className="text-center text-[2.3cqw] text-muted-foreground"
      >
        {ask.micMessage}
      </p>

      <AskMic ask={ask} size="inline" />
    </div>
  );
}
