import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MetaPixel from "@/components/MetaPixel";
import ThankYouClient from "@/components/ThankYouClient";
import { getAllClients, getPublicClientBySlug } from "@/lib/clients";
import { resolveLocalizedText } from "@/lib/i18n";

interface ThankYouPageProps {
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
}: ThankYouPageProps): Promise<Metadata> {
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

  return {
    metadataBase: new URL(siteUrl),
    title:
      lang === "bn"
        ? `অর্ডার সম্পন্ন | ${brandName}`
        : `Order Received | ${brandName}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { slug } = await params;
  const config = getPublicClientBySlug(slug);

  if (!config) {
    notFound();
  }

  return (
    <>
      <MetaPixel pixelId={config.pixelId} />
      <ThankYouClient config={config} />
    </>
  );
}
