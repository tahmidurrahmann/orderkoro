import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPageClient from "@/components/LegalPageClient";
import { getPublicClientBySlug } from "@/lib/clients";
import { getServerClientSecrets } from "@/lib/server-clients";
import { resolveLocalizedText } from "@/lib/i18n";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    if (!secrets?.previewToken || resolvedSearchParams.preview !== secrets.previewToken) {
      return {
        metadataBase: new URL(siteUrl),
        title: "পেজটি পাওয়া যায়নি | Page Not Found",
        robots: { index: false, follow: false },
      };
    }
  }

  const lang = config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const isDraft = config.status === "draft";

  return {
    metadataBase: new URL(siteUrl),
    title:
      lang === "bn"
        ? `শর্তাবলী, ডেলিভারি ও রিটার্ন পলিসি | ${brandName}`
        : `Terms, Delivery & Return Policy | ${brandName}`,
    description:
      lang === "bn"
        ? `${brandName} এর ক্যাশ অন ডেলিভারি, ডেলিভারি চার্জ এবং সহজ রিটার্ন পলিসি।`
        : `Cash on Delivery terms, delivery rates, and easy returns policy for ${brandName}.`,
    robots: {
      index: !isDraft,
      follow: !isDraft,
    },
  };
}

export default async function TermsPage({ params, searchParams }: LegalPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const config = getPublicClientBySlug(slug);

  if (!config) {
    notFound();
  }

  if (config.status === "draft") {
    const secrets = getServerClientSecrets(slug);
    if (!secrets?.previewToken || resolvedSearchParams.preview !== secrets.previewToken) {
      notFound();
    }
  }

  return <LegalPageClient config={config} type="terms" />;
}
