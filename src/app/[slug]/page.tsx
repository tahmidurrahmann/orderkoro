import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductOrderClient from "@/components/ProductOrderClient";
import { getAllClients, getClientBySlug } from "@/lib/clients";
import { formatPrice } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllClients().map((client) => ({
    slug: client.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getClientBySlug(slug);

  if (!config) {
    return {
      title: "পেজটি পাওয়া যায়নি | Page Not Found",
    };
  }

  const lang = config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const title = resolveLocalizedText(config.product.title, lang);
  const description = resolveLocalizedText(config.product.shortDescription, lang);
  const formattedPrice = formatPrice(config.product.price, lang);
  const ogImage = config.ogImage || config.product.images[0];

  return {
    title: `${title} | ${formattedPrice} | ${brandName}`,
    description,
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
  const config = getClientBySlug(slug);

  if (!config) {
    notFound();
  }

  return <ProductOrderClient config={config} />;
}
