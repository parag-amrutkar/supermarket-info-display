"use client";

import { AskMic } from "@/components/kiosk/ask-mic";
import { AskOverlay } from "@/components/kiosk/ask-overlay";
import { useShoppingAsk } from "@/hooks/use-shopping-ask";
import type { Tenant } from "@/lib/tenants";

/**
 * Push to talk — the only control on the store home screen.
 *
 * Thumb reach is at the bottom of a 1920-tall panel, so the mic is anchored
 * there at hero scale with its status line directly above it. The loop behind it
 * — capture, lookup, navigate or answer — is `useShoppingAsk`, shared with the
 * product screen's smaller mic; the overlays it puts up are `AskOverlay`.
 *
 * The overlays are rendered here rather than by `TenantDisplay` because they
 * belong to this component's state, and they position against `TenantDisplay`'s
 * `relative` root, which has no `overflow-hidden` column between it and here.
 */
export function PushToTalk({ tenant }: { tenant: Tenant }) {
  const ask = useShoppingAsk({
    tenantId: tenant.id,
    idlePrompt: "Tap to ask where something is",
  });

  return (
    <>
      <AskOverlay ask={ask} />

      <div className="flex shrink-0 flex-col items-center gap-[3.5cqw] px-[6cqw] pb-[10cqw]">
        {ask.voiceError ? (
          <p
            role="alert"
            className="text-center text-[2.2cqw] leading-snug text-destructive"
          >
            {ask.voiceError}
          </p>
        ) : null}

        <p
          role="status"
          className="text-center text-[2.6cqw] text-muted-foreground"
        >
          {ask.micMessage}
        </p>

        <AskMic ask={ask} size="hero" />
      </div>
    </>
  );
}
