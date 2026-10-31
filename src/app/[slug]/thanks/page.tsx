import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ThankYouClient from "@/components/ThankYouClient";
import { getAllClients, getClientBySlug } from "@/lib/clients";
import { resolveLocalizedText } from "@/lib/i18n";

interface ThankYouPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllClients().map((client) => ({
    slug: client.slug,
  }));
}

export async function generateMetadata({
  params,
}: ThankYouPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getClientBySlug(slug);

  if (!config) {
    return {
      title: "পেজটি পাওয়া যায়নি | Page Not Found",
    };
  }

  const lang = config.language.default;
  const brandName = resolveLocalizedText(config.brand.name, lang);

  return {
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
  const config = getClientBySlug(slug);

  if (!config) {
    notFound();
  }

  return <ThankYouClient config={config} />;
}
