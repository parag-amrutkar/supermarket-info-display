import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PanelFrame } from "@/components/kiosk/panel-frame";
import { WayfindingRoute } from "@/components/kiosk/wayfinding-route";
import { getProductContent, getVerifiedProduct } from "@/lib/products";
import { getStoreContext } from "@/lib/shopping-agent";

type MapPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: MapPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductContent(slug);

  return {
    title: product
      ? `Find ${product.brand} ${product.name} — Beacon Box`
      : "Product not found",
  };
}

/**
 * The route from the kiosk to the shelf, for a product reached by URL.
 *
 * The product lookup validates the slug and supplies the verified shelf label.
 * The animation remains a pre-rendered demonstration, so the screen labels it
 * as such rather than implying its drawn route is product-specific.
 */
export default async function MapPage({ params }: MapPageProps) {
  const { slug } = await params;
  const content = getProductContent(slug);
  const store = content ? getStoreContext(content.tenantId) : null;

  // Do not turn an editorial-only product into a shelf claim. Product details
  // remain useful without inventory, but maps require this tenant's inventory.
  if (!content || !store?.inventoryAvailable) {
    notFound();
  }
  const product = await getVerifiedProduct(slug, store.storeId);

  if (!product) {
    return (
      <PanelFrame>
        <section className="@container flex h-full w-full flex-col items-center justify-center gap-[2cqw] p-[6cqw] text-center">
          <h1 className="text-[4cqw] font-semibold">Shelf map unavailable</h1>
          <p className="w-[75cqw] text-[2.4cqw] leading-snug text-muted-foreground">
            We could not verify this product&apos;s current shelf location. Please ask a store team member.
          </p>
          <Link href={`/product/${slug}`} className="rounded-xl bg-brand px-[4cqw] py-[2.5cqw] text-[2.4cqw] font-semibold text-brand-foreground">
            Back to product
          </Link>
        </section>
      </PanelFrame>
    );
  }

  return (
    <PanelFrame>
      <WayfindingRoute
        backHref={`/product/${slug}`}
        productSlug={slug}
        productName={`${product.brand} ${product.name}`}
        directions={product.location}
      />
    </PanelFrame>
  );
}
