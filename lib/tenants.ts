/**
 * Demo tenants for the Beacon Box kiosk.
 *
 * A "tenant" is the business that owns a given machine. The kiosk re-skins to
 * the tenant's branding once an operator signs in, which is the whole point of
 * the demo: the same hardware and software becomes the store's own screen.
 *
 * Brand colours are plain `oklch()` strings rather than Tailwind classes so a
 * tenant can be applied at runtime by assigning them to the `--brand*` custom
 * properties. See `brandStyle()` below and the note in `app/globals.css`.
 */

import type { CSSProperties } from "react";

/** Digits in a staff PIN. The keypad verifies as soon as this many are entered. */
export const PIN_LENGTH = 4;

export type TenantBrand = {
  /** Primary brand colour; becomes `--brand` (`bg-brand`, `text-brand`). */
  base: string;
  /** Colour for text and icons sitting on top of `base`. */
  foreground: string;
  /** Deeper shade of `base`, for gradients and pressed states. */
  muted: string;
  /** Optional secondary colour. The bodega uses it for its awning stripe. */
  accent?: string;
};

/** Which wordmark treatment to render. See `components/kiosk/tenant-wordmark.tsx`. */
export type TenantWordmark = "cvs" | "sunrise";

export type Tenant = {
  id: string;
  /** Business name, as shown in the kiosk chrome. */
  name: string;
  wordmark: TenantWordmark;
  /** Store identifier, displayed next to the wordmark once signed in. */
  storeNumber: string;
  /** Street address of the machine. */
  address: string;
  /** One-line description of the machine, shown on the home screen card. */
  descriptor: string;
  /**
   * Staff PIN. DEMO ONLY — see the warning in `lib/demo-auth.ts`. This value
   * reaches the browser, so treat it as public.
   */
  pin: string;
  brand: TenantBrand;
};

export const TENANTS: Tenant[] = [
  {
    // Brand treatment is an unlicensed placeholder for an internal demo: the
    // wordmark is drawn as text, not a logo asset, and nothing here is
    // CVS-supplied. Swap in real assets under agreement before anything
    // customer-facing.
    id: "cvs-2841",
    name: "CVS Pharmacy",
    wordmark: "cvs",
    storeNumber: "#2841",
    address: "1396 Fulton St, Brooklyn NY",
    descriptor: "Enterprise chain · 14 screens on site",
    pin: "2841",
    brand: {
      base: "oklch(0.5308 0.2178 29.2339)", // CVS red #CC0000
      foreground: "oklch(1.0000 0 0)",
      muted: "oklch(0.4082 0.1675 29.2339)",
    },
  },
  {
    id: "sunrise-deli",
    name: "Sunrise Deli & Grocery",
    wordmark: "sunrise",
    storeNumber: "#001",
    address: "755 Nostrand Ave, Brooklyn NY",
    descriptor: "Independent bodega · 1 screen on site",
    pin: "1972",
    brand: {
      base: "oklch(0.4678 0.1091 152.0079)", // awning green #1B6B3A
      foreground: "oklch(0.9367 0.0367 86.1738)", // cream #F5E9CF
      muted: "oklch(0.3604 0.0790 154.8185)",
      accent: "oklch(0.5554 0.1835 28.5138)", // awning red #C8372D
    },
  },
];

export function getTenant(id: string): Tenant | undefined {
  return TENANTS.find((t) => t.id === id);
}

/**
 * Inline style that re-skins a subtree to a tenant's branding.
 *
 * Relies on `@theme inline` in `app/globals.css`: because the theme maps
 * `--color-brand` to `var(--brand)`, utilities like `bg-brand` emit a live
 * `var()` reference, so overriding the custom property here cascades to every
 * descendant without any per-tenant CSS.
 *
 * Note: `oklch()` in `globals.css` is downleveled to hex at build time, but
 * inline styles bypass that, so these ship as literal `oklch()`. Fine on any
 * 2023+ browser; an ancient Android WebView panel would drop tenant colours
 * while keeping the house theme.
 */
export function brandStyle(tenant: Tenant): CSSProperties {
  return {
    "--brand": tenant.brand.base,
    "--brand-foreground": tenant.brand.foreground,
    "--brand-muted": tenant.brand.muted,
    ...(tenant.brand.accent ? { "--brand-accent": tenant.brand.accent } : {}),
    // Re-point the shadcn semantic tokens at the tenant too, so stock `ui/`
    // primitives (Button, Badge, every focus-visible ring) pick up the brand
    // without a tenant-aware class at each call site.
    "--primary": tenant.brand.base,
    "--primary-foreground": tenant.brand.foreground,
    "--ring": tenant.brand.base,
  } as CSSProperties;
}
