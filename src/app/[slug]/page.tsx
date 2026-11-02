import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MetaPixel from "@/components/MetaPixel";
import ProductOrderClient from "@/components/ProductOrderClient";
import type { ImagesManifest } from "@/components/ui/StorefrontImage";
import { getPublicClientBySlug } from "@/lib/clients";
import { getServerClientSecrets } from "@/lib/server-clients";
import { formatPrice } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function getClientImagesManifest(slug: string): ImagesManifest | undefined {
  try {
    const manifestPath = path.join(process.cwd(), "public", slug, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    }
  } catch {}
  return undefined;
}

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ slug: "demo-brand" }];
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const config = getPublicClientBySlug(slug);

  if (!config) {
    return {
      metadataBase: new URL(siteUrl),
      title: "পেজটি পাওয়া যায়নি | Page Not Found",
      robots: { index: false, follow: false },
    };
  }

  // Draft stores require a valid server-only previewToken
  if (config.status === "draft") {
    const secrets = getServerClientSecrets(slug);
    if (!secrets?.previewToken || !preview || preview !== secrets.previewToken) {
      return {
        metadataBase: new URL(siteUrl),
        title: "পেজটি পাওয়া যায়নি | Page Not Found",
        robots: { index: false, follow: false },
      };
    }
  }

  const lang = config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const title = resolveLocalizedText(config.product.title, lang);
  const description = resolveLocalizedText(config.product.shortDescription, lang);
  const formattedPrice = formatPrice(config.product.price, lang);
  const ogImage = config.ogImage || config.product.images[0];
  // Draft pages are strictly noindex
  const shouldIndex = config.status === "active" && config.seo?.index !== false;

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

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const config = getPublicClientBySlug(slug);

  if (!config) {
    notFound();
  }

  // Draft stores return 404 unless ?preview=<token> matches server-only previewToken
  if (config.status === "draft") {
    const secrets = getServerClientSecrets(slug);
    if (!secrets?.previewToken || !preview || preview !== secrets.previewToken) {
      notFound();
    }
  }

  const imagesManifest = getClientImagesManifest(slug);

  return (
    <>
      <MetaPixel pixelId={config.pixelId} />
      <ProductOrderClient config={config} imagesManifest={imagesManifest} />
    </>
  );
}
