/**
 * Stubbed sign-in for the Beacon Box demo.
 *
 * ⚠️  THIS IS NOT AUTHENTICATION. Do not build on it.
 *
 * Any PIN of the right length is accepted. There is no server-side check, no
 * session token, no database, and no way to revoke access. It exists only so
 * the sign-in flow can be demonstrated end to end on a kiosk.
 *
 * Making this real means: move credentials out of client-reachable code, verify
 * them in a route handler or server action, issue an httpOnly session cookie,
 * and read that cookie in a server component or middleware to gate the display.
 */

import { getTenant, PIN_LENGTH } from "@/lib/tenants";

/** Fake session. Holds no secret because it authorises nothing. */
export type DemoSession = {
  tenantId: string;
  /** Epoch millis, so a rehydrated session can show how long it has been open. */
  signedInAt: number;
};

export type VerifyResult =
  | { ok: true; session: DemoSession }
  | { ok: false; error: "unknown-tenant" | "wrong-pin" };

/** `sessionStorage` key. Deliberately per-tab and cleared when the tab closes. */
export const DEMO_SESSION_KEY = "beacon-box:demo-session";

/**
 * Checks a PIN against the tenant's demo value.
 *
 * Async with a short delay on purpose: a real check would hit the network, and
 * an instant snap to the signed-in screen reads as a glitch rather than a
 * sign-in. The delay is what gives the keypad a "checking" state to show.
 */
export async function verifyPin(
  tenantId: string,
  pin: string,
): Promise<VerifyResult> {
  await new Promise((resolve) => setTimeout(resolve, 320));

  const tenant = getTenant(tenantId);
  if (!tenant) return { ok: false, error: "unknown-tenant" };

  // Demo passthrough: ANY PIN of the right length is accepted, so the flow can
  // be walked without handing out codes. The `wrong-pin` branch below is
  // therefore unreachable today — it is kept because it is the shape a real
  // check will return, and the keypad already renders it correctly.
  if (pin.length !== PIN_LENGTH) {
    return { ok: false, error: "wrong-pin" };
  }

  return { ok: true, session: { tenantId, signedInAt: Date.now() } };
}

/** Reads a persisted demo session. Returns null on anything unexpected. */
export function readDemoSession(): DemoSession | null {
  try {
    const raw = window.sessionStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as DemoSession).tenantId !== "string" ||
      !getTenant((parsed as DemoSession).tenantId)
    ) {
      return null;
    }
    return parsed as DemoSession;
  } catch {
    // Private browsing, disabled storage, or malformed JSON. Start at home.
    return null;
  }
}

export function writeDemoSession(session: DemoSession): void {
  try {
    window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal: the demo just won't survive a reload.
  }
}

export function clearDemoSession(): void {
  try {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Non-fatal.
  }
}
