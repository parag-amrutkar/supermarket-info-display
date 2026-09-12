"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";

import { AwningStripe, TenantWordmark } from "@/components/kiosk/tenant-wordmark";
import { Card, CardContent } from "@/components/ui/card";
import { brandStyle, type Tenant } from "@/lib/tenants";

/**
 * Which business owns this machine. Portrait-first: the column is a container
 * and type is sized in `cqw`, so the screen scales with the panel instead of
 * needing a breakpoint pass per kiosk size.
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
    <div className="@container flex h-full w-full flex-col gap-[5cqw] px-[6cqw] py-[7cqw]">
      <header className="flex shrink-0 items-center gap-[3cqw]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid size-[9cqw] shrink-0 place-items-center rounded-xl ring-1 ring-foreground/15 transition-colors outline-none hover:bg-card focus-visible:ring-4 focus-visible:ring-primary/70"
        >
          <ArrowLeft className="size-[4.5cqw]" />
        </button>
        <span className="text-[1.9cqw] tracking-[0.24em] text-muted-foreground uppercase">
          Staff sign-in
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-[4cqw]">
        <div className="space-y-[1.5cqw] text-center">
          <h1 className="text-[5.4cqw] leading-tight font-semibold tracking-[-0.02em]">
            Select this machine
          </h1>
          <p className="text-[2.4cqw] text-muted-foreground">
            Choose the business that owns this screen
          </p>
        </div>

        <div className="flex flex-col gap-[3cqw]">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              onClick={() => onSelect(tenant)}
              style={brandStyle(tenant)}
              className="group rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-brand/70 active:translate-y-px"
            >
              <Card className="gap-0 rounded-2xl pt-0 shadow-sm ring-1 ring-foreground/15 transition-colors group-hover:ring-brand/60 [--card-spacing:--spacing(6)]">
                {/* Brand edge, so each machine is identifiable before sign-in.
                    The bodega gets its awning stripe; the chain a flat bar. */}
                {tenant.brand.accent ? (
                  <AwningStripe className="h-[1.6cqw]" />
                ) : (
                  <div aria-hidden="true" className="h-[1.6cqw] w-full bg-brand" />
                )}

                <CardContent className="flex items-center gap-[3cqw] pt-[3cqw]">
                  <span className="grid h-[13cqw] w-[26cqw] shrink-0 place-items-center overflow-hidden rounded-xl bg-brand text-brand-foreground">
                    <TenantWordmark
                      tenant={tenant}
                      decorative
                      className="text-[2.6cqw]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[0.4cqw]">
                    <span className="truncate text-[3.2cqw] leading-tight font-semibold">
                      {tenant.name}
                    </span>
                    <span className="truncate text-[2.1cqw] text-muted-foreground">
                      {tenant.storeNumber} · {tenant.address}
                    </span>
                    <span className="truncate text-[1.95cqw] text-brand">
                      {tenant.descriptor}
                    </span>
                  </span>
                  <ChevronRight className="size-[4cqw] shrink-0 text-muted-foreground transition-transform group-hover:translate-x-[0.5cqw]" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      <footer className="shrink-0 text-center text-[1.8cqw] text-muted-foreground">
        Demo build · any 4-digit PIN is accepted
      </footer>
    </div>
  );
}
