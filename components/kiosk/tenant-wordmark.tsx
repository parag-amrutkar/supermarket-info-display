import { cn } from "cn";

import type { Tenant } from "@/lib/tenants";

/**
 * Tenant wordmarks, drawn as styled text and inline SVG.
 *
 * Deliberately no image assets: the CVS treatment is an unlicensed placeholder
 * for an internal demo, so there is no logo file to fetch or commit. Replace
 * with supplied artwork before anything customer-facing.
 *
 * Everything sizes in `em`, so a parent sets one font-size and the whole mark
 * scales with it — which is how these survive being used at both home-screen
 * card size and signed-in header size.
 */

function HeartGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21s-7.5-4.7-9.5-9A5.6 5.6 0 0 1 12 6.3 5.6 5.6 0 0 1 21.5 12c-2 4.3-9.5 9-9.5 9Z" />
    </svg>
  );
}

function SunGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
      <path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.9 1.9M17.3 17.3l1.9 1.9M19.2 4.8l-1.9 1.9M6.7 17.3l-1.9 1.9" />
    </svg>
  );
}

/** Bodega awning stripes. Uses `--brand-accent` when the tenant defines one. */
export function AwningStripe({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-full bg-[repeating-linear-gradient(90deg,var(--brand-accent,var(--brand-muted))_0_1.6rem,var(--brand-foreground)_1.6rem_3.2rem)]",
        className,
      )}
    />
  );
}

function CvsWordmark() {
  return (
    <span className="inline-flex items-center gap-[0.14em] leading-none">
      <span className="font-bold tracking-[-0.045em]">CVS</span>
      <HeartGlyph className="size-[0.42em] shrink-0" />
      <span className="text-[0.52em] font-light tracking-[0.015em] lowercase">
        pharmacy
      </span>
    </span>
  );
}

function SunriseWordmark() {
  return (
    <span className="inline-flex items-center gap-[0.22em] leading-none">
      <SunGlyph className="size-[0.78em] shrink-0" />
      <span className="inline-flex flex-col items-start">
        <span className="text-[0.92em] font-bold tracking-[-0.02em]">
          Sunrise
        </span>
        <span className="text-[0.3em] font-semibold tracking-[0.26em] uppercase opacity-75">
          Deli &amp; Grocery
        </span>
      </span>
    </span>
  );
}

export function TenantWordmark({
  tenant,
  className,
  /** Hide from assistive tech. Set this where the tenant's name is already
   *  rendered as text next to the mark, so it is not announced twice. */
  decorative = false,
}: {
  tenant: Tenant;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-center font-sans", className)}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": tenant.name })}
    >
      {tenant.wordmark === "cvs" ? <CvsWordmark /> : <SunriseWordmark />}
    </span>
  );
}
