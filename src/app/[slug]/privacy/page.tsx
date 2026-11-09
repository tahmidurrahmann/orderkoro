import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPageClient from "@/components/LegalPageClient";
import { getPublicClientBySlug } from "@/lib/clients";
import { getServerClientSecrets } from "@/lib/server-clients";
import { resolveLocalizedText } from "@/lib/i18n";
import { getSellerFavicon } from "@/lib/seller-brand";

interface LegalPageProps {
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
}: LegalPageProps): Promise<Metadata> {
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
  const pageTitle =
    lang === "bn"
      ? `প্রাইভেসি পলিসি | ${brandName}`
      : `Privacy Policy | ${brandName}`;
  const pageDescription =
    lang === "bn"
      ? `${brandName} এর গ্রাহক তথ্য সংগ্রহ ও সুরক্ষা নীতি।`
      : `Customer privacy and data protection policy for ${brandName}.`;

  return {
    metadataBase: new URL(siteUrl),
    title: pageTitle,
    description: pageDescription,
    icons: [{ url: getSellerFavicon(config) }],
    robots: {
      index: false,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function PrivacyPage({
  params,
  searchParams,
}: LegalPageProps) {
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

  return <LegalPageClient config={config} type="privacy" />;
}
