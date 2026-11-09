import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MetaPixel from "@/components/MetaPixel";
import ThankYouClient from "@/components/ThankYouClient";
import { getPublicClientBySlug } from "@/lib/clients";
import { getServerClientSecrets } from "@/lib/server-clients";
import { resolveLocalizedText } from "@/lib/i18n";
import { getSellerFavicon } from "@/lib/seller-brand";

interface ThankYouPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.shop";

export const dynamicParams = true;

export function generateStaticParams() {
  return [{ slug: "demo-brand" }];
}

export async function generateMetadata({
  params,
  searchParams,
}: ThankYouPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const config = getPublicClientBySlug(slug);

  if (!config) {
    return {
      metadataBase: new URL(siteUrl),
      title: "পেজটি পাওয়া যায়নি | Page Not Found",
      robots: { index: false, follow: false },
    };
  }

  if (config.status === "draft") {
    const secrets = getServerClientSecrets(slug);
    if (
      !secrets?.previewToken ||
      resolvedSearchParams.preview !== secrets.previewToken
    ) {
      return {
        metadataBase: new URL(siteUrl),
        title: "পেজটি পাওয়া যায়নি | Page Not Found",
        robots: { index: false, follow: false },
      };
    }
  }

  const lang = config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const ogImage = config.ogImage || config.product.images[0];

  return {
    metadataBase: new URL(siteUrl),
    title:
      lang === "bn"
        ? `অর্ডার সম্পন্ন | ${brandName}`
        : `Order Received | ${brandName}`,
    icons: [{ url: getSellerFavicon(config) }],
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title:
        lang === "bn"
          ? `অর্ডার সম্পন্ন | ${brandName}`
          : `Order Received | ${brandName}`,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title:
        lang === "bn"
          ? `অর্ডার সম্পন্ন | ${brandName}`
          : `Order Received | ${brandName}`,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ThankYouPage({
  params,
  searchParams,
}: ThankYouPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const config = getPublicClientBySlug(slug);

  if (!config) {
    notFound();
  }

  if (config.status === "draft") {
    const secrets = getServerClientSecrets(slug);
    if (
      !secrets?.previewToken ||
      resolvedSearchParams.preview !== secrets.previewToken
    ) {
      notFound();
    }
  }

  return (
    <>
      <MetaPixel pixelId={config.pixelId} />
      <ThankYouClient config={config} />
    </>
  );
}
