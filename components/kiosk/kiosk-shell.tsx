"use client";

import * as React from "react";

import { AdLoopScreen } from "@/components/kiosk/ad-loop-screen";
import { BeaconMark } from "@/components/kiosk/beacon-mark";
import { PinPad } from "@/components/kiosk/pin-pad";
import { TenantDisplay } from "@/components/kiosk/tenant-display";
import { TenantPicker } from "@/components/kiosk/tenant-picker";
import { WayfindingScreen } from "@/components/kiosk/wayfinding-screen";
import { WelcomeScreen } from "@/components/kiosk/welcome-screen";
import {
  clearDemoSession,
  type DemoSession,
  readDemoSession,
  writeDemoSession,
} from "@/lib/demo-auth";
import {
  brandStyle,
  getTenant,
  type Tenant,
  type TenantAd,
} from "@/lib/tenants";

/**
 * The kiosk flow, one full-panel screen per step:
 *
 *   boot → welcome (Beacon Box branding, quiet log-in)
 *        → picker  (which business owns this machine)
 *        → pin     (staff keypad)
 *        → ad      (full-bleed spot on a loop — only for a tenant carrying one)
 *        → display (tenant-branded home screen)
 *                  → wayfinding (full-bleed store map to a product)
 *
 * A tenant carrying an `ad` (the bodega) rests on that spot after sign-in and
 * touching it anywhere opens the home screen; every other tenant goes straight
 * to the home screen. `signedInFlow()` below is the single place that decides.
 *
 * This is the app's only client boundary. `app/` stays server-only (see
 * `app/CLAUDE.md`), so all interactivity lives here and below.
 *
 * The steps are state, not routes, on purpose. Authentication is stubbed (see
 * `lib/demo-auth.ts`), so there is no cookie a server component could read — a
 * `/display` route would be guarded by nothing and bypassable by typing the
 * URL. One route keeps the demo honest.
 */

type Flow =
  | { step: "booting" }
  | { step: "welcome" }
  | { step: "picking" }
  | { step: "pin"; tenant: Tenant }
  | { step: "ad"; tenant: Tenant; session: DemoSession; ad: TenantAd }
  | { step: "signedIn"; tenant: Tenant; session: DemoSession }
  | { step: "wayfinding"; tenant: Tenant; session: DemoSession };

/** Where a tenant lands once signed in. The step carries the ad rather than
 *  re-reading `tenant.ad` at the render site, so the screen takes a required
 *  prop and no call site needs a non-null assertion. */
function signedInFlow(tenant: Tenant, session: DemoSession): Flow {
  const ad = tenant.ad;
  return ad
    ? { step: "ad", tenant, session, ad }
    : { step: "signedIn", tenant, session };
}

/** Shown for one frame while the persisted session is read. Must be what the
 *  server renders too, or hydration disagrees. */
function BootSplash() {
  return (
    <div className="@container flex h-full w-full flex-col items-center justify-center gap-[3cqw]">
      <BeaconMark className="size-[20cqw] text-primary motion-safe:animate-pulse" />
      <span className="text-[2.2cqw] tracking-[0.3em] text-muted-foreground uppercase">
        Beacon Box
      </span>
    </div>
  );
}

export function KioskShell({ tenants }: { tenants: Tenant[] }) {
  const [flow, setFlow] = React.useState<Flow>({ step: "booting" });

  // Rehydrate after mount, never during render: the server has no session, so
  // restoring one in the initial render would be a hydration mismatch. Starting
  // at `booting` rather than `welcome` is what stops the attract screen
  // flashing for a frame on every signed-in reload.
  React.useEffect(() => {
    const session = readDemoSession();
    const tenant = session ? getTenant(session.tenantId) : undefined;
    // A reloaded kiosk returns to its resting screen, which for an ad tenant is
    // the spot rather than the home screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlow(
      session && tenant ? signedInFlow(tenant, session) : { step: "welcome" },
    );
  }, []);

  const handleSuccess = (tenant: Tenant) => (session: DemoSession) => {
    writeDemoSession(session);
    setFlow(signedInFlow(tenant, session));
  };

  const handleSignOut = () => {
    clearDemoSession();
    setFlow({ step: "welcome" });
  };

  const branded =
    flow.step === "pin" ||
    flow.step === "ad" ||
    flow.step === "signedIn" ||
    flow.step === "wayfinding";

  return (
    // Backdrop. Only ever visible when the viewport is not 9:16 — on the real
    // 1080x1920 panel the kiosk below covers it exactly.
    <div className="grid h-dvh w-full place-items-center overflow-hidden bg-neutral-300">
      <div
        // The panel: locked to 9:16, sized to the largest such box that fits.
        //
        // "9:16 AND fills the viewport" can both hold only when the viewport is
        // itself 9:16 — which the kiosk hardware is. There both min() branches
        // resolve to the full viewport and this renders edge to edge with no
        // letterbox. Off-ratio (a dev laptop) the ratio wins and the spare space
        // becomes backdrop, rather than stretching the design.
        //
        // Written as explicit min()s rather than `aspect-[9/16]` with max-w and
        // max-h: with aspect-ratio, clamping one axis leaves the other at its
        // declared size and silently breaks the ratio. This cannot.
        //
        // Each screen below is h-full, so every step fills this panel.
        className="h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-background text-foreground"
        style={branded ? brandStyle(flow.tenant) : undefined}
      >
        {flow.step === "booting" ? (
          <BootSplash />
        ) : flow.step === "welcome" ? (
          <WelcomeScreen onLogin={() => setFlow({ step: "picking" })} />
        ) : flow.step === "picking" ? (
          <TenantPicker
            tenants={tenants}
            onSelect={(tenant: Tenant) => setFlow({ step: "pin", tenant })}
            onBack={() => setFlow({ step: "welcome" })}
          />
        ) : flow.step === "pin" ? (
          <PinPad
            tenant={flow.tenant}
            onSuccess={handleSuccess(flow.tenant)}
            onCancel={() => setFlow({ step: "picking" })}
          />
        ) : flow.step === "wayfinding" ? (
          <WayfindingScreen
            onBack={() =>
              setFlow({
                step: "signedIn",
                tenant: flow.tenant,
                session: flow.session,
              })
            }
          />
        ) : flow.step === "ad" ? (
          <AdLoopScreen
            ad={flow.ad}
            onOpenHome={() =>
              setFlow({
                step: "signedIn",
                tenant: flow.tenant,
                session: flow.session,
              })
            }
          />
        ) : (
          <TenantDisplay
            tenant={flow.tenant}
            session={flow.session}
            onSignOut={handleSignOut}
            onOpenWayfinding={() =>
              setFlow({
                step: "wayfinding",
                tenant: flow.tenant,
                session: flow.session,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
