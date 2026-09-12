"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";

import { BeaconMark } from "@/components/kiosk/beacon-mark";
import { AwningStripe, TenantWordmark } from "@/components/kiosk/tenant-wordmark";
import { Card, CardContent } from "@/components/ui/card";
import { brandStyle, type Tenant } from "@/lib/tenants";

/**
 * Which business owns this machine. Portrait-first: the column is a container
 * and type is sized in `cqw`, so the screen scales with the panel instead of
 * needing a breakpoint pass per kiosk size.
 *
 * This is the last screen that is still Beacon Box's own — one step later the
 * PIN pad and everything after it wear the tenant's colours. So it leads with
 * the house identity at hero scale and carries nothing else: no eyebrow, no
 * device id, no supporting copy, no per-store metadata. At kiosk distance the
 * only question is which of two logos to press, and every extra line of small
 * type is something a shopper has to visually discard first.
 *
 * The tenant cards each scope their own `--brand` via `brandStyle()`, which is
 * why the house pink here and the store colours there sit on one screen without
 * fighting.
 */
export function TenantPicker({
  tenants,
  onSelect,
  onBack,
}: {
  tenants: Tenant[];
  onSelect: (tenant: Tenant) => void;
  onBack: () => void;
}) {
  return (
    <div className="@container relative isolate flex h-full w-full flex-col gap-[5cqw] overflow-hidden px-[6cqw] py-[7cqw]">
      {/* House wash — the same pink and violet the welcome screen drifts in,
          held still here because this screen is read, not watched. Bled off
          three edges so the gradients never resolve into visible circles. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-[22cqw] -left-[18cqw] size-[80cqw] rounded-full bg-[radial-gradient(circle,var(--primary),transparent_70%)] opacity-25" />
        <div className="absolute -right-[26cqw] bottom-[12cqw] size-[70cqw] rounded-full bg-[radial-gradient(circle,var(--chart-2),transparent_70%)] opacity-20" />
        <div className="absolute -bottom-[24cqw] left-[10cqw] size-[56cqw] rounded-full bg-[radial-gradient(circle,var(--accent),transparent_70%)] opacity-25" />
      </div>

      <header className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid size-[9cqw] shrink-0 place-items-center rounded-xl bg-card/70 ring-1 ring-foreground/15 transition-colors outline-none hover:bg-card focus-visible:ring-4 focus-visible:ring-primary/70"
        >
          <ArrowLeft className="size-[4.5cqw]" />
        </button>
      </header>

      {/* Hero. The house identity at full scale, since this is the last screen
          that belongs to Beacon Box rather than to a store. */}
      <div className="flex shrink-0 flex-col items-center gap-[1.5cqw] text-center">
        <BeaconMark className="size-[15cqw] text-primary" />
        <h1 className="text-[11cqw] leading-[0.92] font-semibold tracking-[-0.035em]">
          Beacon Box
        </h1>
        <p className="text-[3.4cqw] font-medium text-muted-foreground">
          Select this machine
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-[3.5cqw]">
        {tenants.map((tenant) => (
          <button
            key={tenant.id}
            type="button"
            onClick={() => onSelect(tenant)}
            style={brandStyle(tenant)}
            className="group rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-brand/70 active:translate-y-px"
          >
            <Card className="gap-0 rounded-2xl pt-0 shadow-sm ring-1 ring-foreground/15 transition-colors group-hover:ring-brand/60 [--card-spacing:--spacing(6)]">
              {/* Brand edge, so each machine is identifiable at a glance.
                  The bodega gets its awning stripe; the chain a flat bar. */}
              {tenant.brand.accent ? (
                <AwningStripe className="h-[1.6cqw]" />
              ) : (
                <div aria-hidden="true" className="h-[1.6cqw] w-full bg-brand" />
              )}

              <CardContent className="flex items-center gap-[3cqw] pt-[3cqw]">
                <span className="grid h-[14cqw] w-[28cqw] shrink-0 place-items-center overflow-hidden rounded-xl bg-brand text-brand-foreground">
                  <TenantWordmark
                    tenant={tenant}
                    decorative
                    className="text-[2.8cqw]"
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-[3.6cqw] leading-tight font-semibold">
                  {tenant.name}
                </span>
                <ChevronRight className="size-[4.5cqw] shrink-0 text-muted-foreground transition-transform group-hover:translate-x-[0.5cqw]" />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
