import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPageClient from "@/components/LegalPageClient";
import { getPublicClientBySlug } from "@/lib/clients";
import { getServerClientSecrets } from "@/lib/server-clients";
import { resolveLocalizedText } from "@/lib/i18n";
import { getSellerFavicon } from "@/lib/seller-brand";
import type { SupportedLocale } from "@/lib/format";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string; lang?: string }>;
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

  const langQuery = resolvedSearchParams.lang;
  const lang: SupportedLocale =
    (langQuery === "en" || langQuery === "bn") && config.language.allowSwitch
      ? langQuery
      : config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const ogImage = config.ogImage || config.product.images[0];
  const pageTitle =
    lang === "bn"
      ? `শর্তাবলী, ডেলিভারি ও রিটার্ন পলিসি | ${brandName}`
      : `Terms, Delivery & Return Policy | ${brandName}`;
  const pageDescription =
    lang === "bn"
      ? `${brandName} এর ক্যাশ অন ডেলিভারি, ডেলিভারি চার্জ এবং সহজ রিটার্ন পলিসি।`
      : `Cash on Delivery terms, delivery rates, and easy returns policy for ${brandName}.`;

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

export default async function TermsPage({
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

  return <LegalPageClient config={config} type="terms" />;
}
