import Image from "next/image";
import Link from "next/link";
import { ChevronRight, IdCard, MapPin, Mic, Star } from "lucide-react";
import { cn } from "cn";

import { BeaconMark } from "@/components/kiosk/beacon-mark";
import { AwningStripe, TenantWordmark } from "@/components/kiosk/tenant-wordmark";
import { isLowStock, type Product, type Rating, stockLabel } from "@/lib/products";
import { brandStyle, type Tenant } from "@/lib/tenants";

/**
 * Product detail screen. One panel, no scrolling.
 *
 * Everything fits the 9:16 frame on purpose: a shopper standing at a machine
 * reads what is in front of them and walks off, so anything below a fold would
 * simply not be seen.
 *
 * Two things carry most of the layout:
 *
 * - **The map link is the only filled control on the screen.** Everything else
 *   is outlined, so "where is it" reads as the action and the spoken prompts
 *   read as suggestions. Fill beats size or position for that, and it survives
 *   a tenant re-skin because it uses the brand token.
 * - **Three prompts, one per bucket** — same line, other brands, everything
 *   else. They replace an accordion and two carousels; the answers arrive on
 *   demand instead of costing permanent screen space.
 *
 * Wears the tenant's identity. `brandStyle()` sets `--brand*` on the root, so
 * every `bg-brand` and `text-brand` below re-skins with no tenant-aware class
 * at any call site — the directions button turns CVS red on a pharmacy screen
 * and bodega green on the deli's, and the awning stripe appears only for a
 * tenant that defines an accent.
 *
 * No client components: nothing here is interactive beyond two links.
 */
export function ProductScreen({
  product,
  tenant,
}: {
  product: Product;
  /** Omitted for an unbranded machine; the screen then keeps the house theme. */
  tenant?: Tenant;
}) {
  const { location, stock } = product;
  const low = isLowStock(stock);
  const out = stock.status === "out";

  return (
    <div
      className="@container flex h-full w-full flex-col"
      style={tenant ? brandStyle(tenant) : undefined}
    >
      {/* The moment the panel stops being Beacon Box and becomes the store's
          own screen. No sign-out here, unlike the staff-facing display — this
          side is for the shopper. */}
      {tenant ? (
        <>
          <header className="flex shrink-0 items-center gap-[3cqw] bg-brand px-[5cqw] py-[2.6cqw] text-brand-foreground">
            <TenantWordmark tenant={tenant} className="text-[3cqw]" />
            <span className="flex-1" />
            <span className="text-[1.9cqw] font-semibold opacity-85">
              {tenant.storeNumber}
            </span>
          </header>
          {tenant.brand.accent ? (
            <AwningStripe className="h-[1.6cqw] shrink-0" />
          ) : null}
        </>
      ) : null}
      {/* Starting over beats stepping back: a shopper who is done with this
          product wants to ask about a different one, not return to a category
          listing they never saw.
 
          Dressed as a spoken prompt, not a search field. A magnifier and grey
          placeholder text say "type here", which is the one thing this machine
          cannot do — so it borrows the mic and the phrasing of the Just ask
          rows below and reads as something you say out loud. */}
      <header className="shrink-0 px-[5cqw] pt-[3cqw] pb-[2cqw]">
        <Link
          href="/"
          className="flex items-center gap-[2.5cqw] rounded-2xl bg-card px-[3.5cqw] py-[2.8cqw] ring-1 ring-foreground/10 transition-colors hover:bg-secondary active:translate-y-px"
        >
          <Mic className="size-[3.2cqw] shrink-0 text-brand" />
          <span className="text-[2.4cqw] leading-snug font-medium">
            Ask about something else
          </span>
        </Link>
      </header>

      {/* overflow-hidden, not overflow-auto: if this ever stops fitting that is
          a content bug to fix here, not something to hand to the shopper. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[2.4cqw] overflow-hidden px-[5cqw] pt-[1cqw] pb-[2.5cqw]">
        <nav
          aria-label="Category"
          className="flex shrink-0 flex-wrap items-center gap-x-[1.4cqw] gap-y-[0.4cqw] text-[1.8cqw] text-muted-foreground"
        >
          {product.category.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-[1.4cqw]">
              {i > 0 ? (
                <span aria-hidden className="text-foreground/25">
                  ›
                </span>
              ) : null}
              <span className={i === product.category.length - 1 ? "text-foreground/70" : undefined}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        <div className="relative h-[44cqw] w-full shrink-0 overflow-hidden rounded-2xl bg-card">
          {product.image ? (
            <Image
              src={product.image}
              alt={`${product.brand} ${product.name}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-brand/20 to-accent/30" />
          )}
        </div>

        <div className="shrink-0">
          <p className="text-[1.9cqw] font-semibold tracking-[0.2em] text-brand uppercase">
            {product.brand}
          </p>
          {/* House `destructive` red, not `bg-brand`: the bodega's brand IS
              green, so a brand-coloured badge disappears into its own header.
              The tenant's awning red is `--brand-accent`, which CVS does not
              define — it would fall back to dark red and vanish there. Solid
              fill where out-of-stock is a light tint, so the two reds stay
              distinguishable. */}
          <div className="mt-[0.6cqw] flex flex-wrap items-center gap-x-[2.5cqw] gap-y-[1cqw]">
            <h1 className="text-[6.2cqw] leading-[1.02] font-semibold">
              {product.name}
            </h1>
            {product.promotion ? (
              <span className="rounded-lg bg-destructive px-[2.4cqw] py-[1cqw] text-[2.1cqw] font-bold tracking-[0.08em] text-destructive-foreground uppercase">
                {product.promotion.label}
              </span>
            ) : null}
          </div>
          <p className="mt-[0.8cqw] text-[2.2cqw] leading-snug text-muted-foreground">
            {product.form} · {product.size}
          </p>

          <div className="mt-[1.6cqw] flex flex-wrap items-center gap-x-[3cqw] gap-y-[1.2cqw]">
            <Stars rating={product.rating} />
            {/* Price and its struck-through original stay one unit, so the
                row wraps around the pair rather than between them. */}
            <span className="flex items-baseline gap-[1.6cqw]">
              <span className="text-[4.8cqw] leading-none font-semibold">
                {product.price}
              </span>
              {product.promotion ? (
                <span className="text-[2.4cqw] text-muted-foreground line-through">
                  {product.promotion.wasPrice}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "flex items-center gap-[1.2cqw] rounded-full px-[2.6cqw] py-[1.2cqw] text-[2cqw] font-semibold",
                out
                  ? "bg-destructive/10 text-destructive"
                  // Not brand-tinted: once a tenant's brand IS red (CVS),
                  // "Only 3 left" and "Out of stock" become the same colour.
                  // A solid dark pill separates all three states under any
                  // tenant palette.
                  : low
                    ? "bg-foreground text-background"
                    : "bg-accent/25 text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-[1.2cqw] rounded-full",
                  out
                    ? "bg-destructive"
                    : low
                      ? "bg-background"
                      : "bg-accent",
                )}
              />
              {stockLabel(stock)}
            </span>
          </div>
        </div>

        {/* Sits between the price and the directions, which is the decision
            point: it has to land before someone walks to the aisle, not at the
            register. Neutral rather than destructive-red — this is a rule to
            follow, not an error to fix, and red is already doing "out of
            stock" on this screen. */}
        {product.ageRestriction ? (
          <div className="flex shrink-0 items-center gap-[2.5cqw] rounded-2xl bg-foreground/6 px-[3.5cqw] py-[2.4cqw] ring-1 ring-foreground/15">
            <IdCard className="size-[3.6cqw] shrink-0" />
            <p className="text-[2.2cqw] leading-snug font-semibold">
              {product.ageRestriction}+ only — ID required at the register
            </p>
          </div>
        ) : null}

        <p className="shrink-0 text-[2.4cqw] leading-snug text-pretty">
          {product.summary}
        </p>

        {/* The one filled control on the screen. High-level only — the map
            screen owns wayfinding.
            TODO: repoint once that route lands — it is being built separately. */}
        <Link
          href={`/map/${product.slug}`}
          className="flex shrink-0 items-center gap-[3cqw] rounded-2xl bg-brand px-[4cqw] py-[3.2cqw] text-brand-foreground transition-opacity hover:opacity-90 active:translate-y-px"
        >
          <MapPin className="size-[5cqw] shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[3.2cqw] leading-tight font-semibold">
              {location.aisle} · {location.rack}
            </span>
            <span className="flex items-center gap-[1.4cqw] text-[2cqw] opacity-85">
              <Mic className="size-[2.4cqw] shrink-0" />
              &ldquo;Take me there&rdquo;
            </span>
          </span>
          <ChevronRight className="size-[4cqw] shrink-0 opacity-85" />
        </Link>

        {/* Absorbs whatever vertical slack is left. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="mb-[1.6cqw] shrink-0 text-[2cqw] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Just ask
          </h2>
          <ul className="flex min-h-0 flex-1 flex-col gap-[1.8cqw]">
            {product.suggestedQuestions.map((question) => (
              <li
                key={question}
                className="flex flex-1 items-center gap-[2.5cqw] rounded-2xl bg-card px-[3.5cqw] ring-1 ring-foreground/10"
              >
                <Mic className="size-[3.2cqw] shrink-0 text-brand" />
                <span className="text-[2.6cqw] leading-snug font-medium">
                  {question}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-[1.5cqw] border-t border-foreground/15 py-[1.8cqw] text-[1.6cqw] text-muted-foreground">
        <BeaconMark className="size-[2.8cqw]" />
        Powered by Beacon Box · Device BB-0471
      </footer>
    </div>
  );
}

/** Whole stars only. Half-star glyphs turn to mush at kiosk distance, and the
 *  numeric score beside them carries the precision anyway. */
function Stars({ rating }: { rating: Rating }) {
  const filled = Math.round(rating.score);

  return (
    <span className="flex items-center gap-[1.2cqw]">
      <span className="flex gap-[0.4cqw]" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "size-[2.6cqw]",
              i < filled ? "fill-brand text-brand" : "text-foreground/25",
            )}
          />
        ))}
      </span>
      <span className="text-[2.1cqw] font-semibold">
        {rating.score.toFixed(1)}
      </span>
      <span className="text-[2.1cqw] text-muted-foreground">
        ({rating.count.toLocaleString("en-US")})
      </span>
    </span>
  );
}
