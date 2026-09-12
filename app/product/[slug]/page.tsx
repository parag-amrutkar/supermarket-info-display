import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PanelFrame } from "@/components/kiosk/panel-frame";
import { ProductScreen } from "@/components/kiosk/product-screen";
import { getProduct, productSlugs } from "@/lib/products";

type ProductPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return productSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  return {
    title: product
      ? `${product.brand} ${product.name} — Beacon Box`
      : "Product not found",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <PanelFrame>
      <ProductScreen product={product} />
    </PanelFrame>
  );
}
