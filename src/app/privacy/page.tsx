import type { Metadata } from "next";
import { PlatformLegalClient } from "@/components/landing/PlatformLegalClient";
import { PLATFORM_PRIVACY_COPY } from "@/lib/platform-legal-copy";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.shop";
const pageTitle = `${PLATFORM_PRIVACY_COPY.title.bn} - OrderKoro`;
const pageDescription = PLATFORM_PRIVACY_COPY.subtitle.bn;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/privacy",
    siteName: "OrderKoro",
    type: "website",
    images: [
      {
        url: "/brand/og-orderkoro-v1.jpg",
        width: 1200,
        height: 630,
        alt: "OrderKoro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/brand/og-orderkoro-v1.jpg"],
  },
};

export default function PrivacyPage() {
  return <PlatformLegalClient type="privacy" />;
}
