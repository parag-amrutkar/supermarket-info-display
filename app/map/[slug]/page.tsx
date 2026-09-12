import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PanelFrame } from "@/components/kiosk/panel-frame";
import { WayfindingRoute } from "@/components/kiosk/wayfinding-route";
import { getProduct } from "@/lib/products";

type MapPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: MapPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  return {
    title: product
      ? `Find ${product.brand} ${product.name} — Beacon Box`
      : "Product not found",
  };
}

/**
 * The route from the kiosk to the shelf, for a product reached by URL.
 *
 * The product is looked up only to validate the slug and title the page — the
 * wayfinding animation is a pair of pre-rendered MP4s and takes no props yet,
 * so the route it draws is the same whichever product sent you here. See the
 * note in `wayfinding-screen.tsx`.
 */
export default async function MapPage({ params }: MapPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <PanelFrame>
      <WayfindingRoute backHref={`/product/${slug}`} />
    </PanelFrame>
  );
}
