import Image from "next/image";
import Link from "next/link";
import { ChevronRight, House, IdCard, MapPin, Mic, Star } from "lucide-react";
import { cn } from "cn";

import { BeaconMark } from "@/components/kiosk/beacon-mark";
import { ProductAsk, ProductAskMic } from "@/components/kiosk/product-ask";
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
 * - **The map link is the only filled rectangle on the screen.** Everything else
 *   is outlined, so "where is it" reads as the action among the *links*. Fill
 *   beats size or position for that, and it survives a tenant re-skin because it
 *   uses the brand token.
 * - **A microphone, where three printed prompts used to be.** "Other versions?",
 *   "Other brands?" and "Product questions?" advertised topics but could not be
 *   tapped, and a shopper holding the box has a question in their own words, not
 *   one of three. `product.suggestedQuestions` is now unread by any screen; the
 *   answer bank behind it reaches the shopper through the agent instead.
 *
 * Wears the tenant's identity. `brandStyle()` sets `--brand*` on the root, so
 * every `bg-brand` and `text-brand` below re-skins with no tenant-aware class
 * at any call site — the directions button turns CVS red on a pharmacy screen
 * and bodega green on the deli's, and the awning stripe appears only for a
 * tenant that defines an accent.
 *
 * The screen root is `ProductAsk`, a client component: it is `relative` so the
 * answer popup positions against the panel, and it sits outside the
 * `overflow-hidden` content column below so the popup is not clipped to it.
 * Everything between stays server-rendered.
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
    <ProductAsk
      tenantId={product.tenantId}
      productSlug={product.slug}
      className="@container relative flex h-full w-full flex-col overflow-hidden"
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
          listing they never saw. A panel has no browser chrome, so this is the
          only way back.

          A house and not a microphone, now that the screen carries a real one.
          Two mics where one navigates and one listens is the kind of thing a
          shopper only discovers by tapping the wrong one. */}
      <header className="shrink-0 px-[5cqw] pt-[2.6cqw] pb-[1.4cqw]">
        <Link
          href="/"
          className="flex w-fit items-center gap-[2cqw] rounded-2xl bg-card px-[3cqw] py-[1.8cqw] ring-1 ring-foreground/10 transition-colors hover:bg-secondary active:translate-y-px"
        >
          <House className="size-[2.8cqw] shrink-0 text-brand" />
          <span className="text-[2.2cqw] leading-snug font-medium">
            Store home
          </span>
        </Link>
      </header>

      {/* overflow-hidden, not overflow-auto: if this ever stops fitting that is
          a content bug to fix here, not something to hand to the shopper. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[2.4cqw] overflow-hidden px-[5cqw] pt-[1cqw] pb-[2cqw]">
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

        {/* The one element in this column that flexes, so a product's vertical
            slack lands on its photograph rather than as a dead gap above the
            microphone. Floor and ceiling both matter: the heroes are 1080x780
            (White Claw 1080x500), so `object-cover` crops harder the taller this
            gets, and a product with an age warning and a promotion badge must
            still be able to give the space back. */}
        <div className="relative max-h-[60cqw] min-h-[30cqw] w-full flex-1 overflow-hidden rounded-2xl bg-card">
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

        {/* High-level only — the map screen owns wayfinding. */}
        <Link
          href={`/map/${product.slug}`}
          className="flex shrink-0 items-center gap-[3cqw] rounded-2xl bg-brand px-[4cqw] py-[3cqw] text-brand-foreground transition-opacity hover:opacity-90 active:translate-y-px"
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
      </div>

      {/* Outside the column above, because the popup it raises covers the whole
          panel and that column is `overflow-hidden`. */}
      <ProductAskMic />

      <footer className="mt-[1.6cqw] flex shrink-0 items-center justify-center gap-[1.5cqw] border-t border-foreground/15 py-[1.8cqw] text-[1.6cqw] text-muted-foreground">
        <BeaconMark className="size-[2.8cqw]" />
        Powered by Beacon Box · Device BB-0471
      </footer>
    </ProductAsk>
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
