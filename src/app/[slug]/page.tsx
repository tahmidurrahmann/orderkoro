import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MetaPixel from "@/components/MetaPixel";
import ProductOrderClient from "@/components/ProductOrderClient";
import { getAllClients, getPublicClientBySlug } from "@/lib/clients";
import { formatPrice } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function generateStaticParams() {
  return getAllClients().map((client) => ({
    slug: client.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getPublicClientBySlug(slug);

  if (!config) {
    return {
      metadataBase: new URL(siteUrl),
      title: "পেজটি পাওয়া যায়নি | Page Not Found",
    };
  }

  const lang = config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const title = resolveLocalizedText(config.product.title, lang);
  const description = resolveLocalizedText(config.product.shortDescription, lang);
  const formattedPrice = formatPrice(config.product.price, lang);
  const ogImage = config.ogImage || config.product.images[0];
  const shouldIndex = config.status !== "paused" && config.seo?.index !== false;

  return {
    metadataBase: new URL(siteUrl),
    title: `${title} | ${formattedPrice} | ${brandName}`,
    description,
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: `${title} | ${formattedPrice} | ${brandName}`,
      description,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${formattedPrice} | ${brandName}`,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const config = getPublicClientBySlug(slug);

  if (!config) {
    notFound();
  }

  return (
    <>
      <MetaPixel pixelId={config.pixelId} />
      <ProductOrderClient config={config} />
    </>
  );
}
