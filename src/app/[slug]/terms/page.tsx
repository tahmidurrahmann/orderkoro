import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPageClient from "@/components/LegalPageClient";
import { getAllClients, getPublicClientBySlug } from "@/lib/clients";
import { resolveLocalizedText } from "@/lib/i18n";

interface LegalPageProps {
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
}: LegalPageProps): Promise<Metadata> {
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
        ? `শর্তাবলী, ডেলিভারি ও রিটার্ন পলিসি | ${brandName}`
        : `Terms, Delivery & Return Policy | ${brandName}`,
    description:
      lang === "bn"
        ? `${brandName} এর ক্যাশ অন ডেলিভারি, ডেলিভারি চার্জ এবং সহজ রিটার্ন পলিসি।`
        : `Cash on Delivery terms, delivery rates, and easy returns policy for ${brandName}.`,
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function TermsPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const config = getPublicClientBySlug(slug);

  if (!config) {
    notFound();
  }

  return <LegalPageClient config={config} type="terms" />;
}
