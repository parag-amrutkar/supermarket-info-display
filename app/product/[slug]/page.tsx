import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PanelFrame } from "@/components/kiosk/panel-frame";
import { ProductScreen } from "@/components/kiosk/product-screen";
import { getProduct } from "@/lib/products";

type ProductPageProps = { params: Promise<{ slug: string }> };

/**
 * Never prerendered.
 *
 * Stock and price come from inventory, and a count baked at build time is
 * exactly the "claiming availability the data does not support" failure that
 * AGENTS.md warns about. Being dynamic also keeps the build independent of
 * Supabase being reachable, the way `api/models` is not.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  return {
    title: product
      ? `${product.brand} ${product.name} — Beacon Box`
      : "Product not found",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <PanelFrame>
      <ProductScreen product={product} />
    </PanelFrame>
  );
}
