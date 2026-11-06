import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingBody } from "@/components/landing/LandingBody";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.vercel.app";
const landingTitle = "OrderKoro (Order Koro) | অর্ডার করো - ফেসবুক সেলারদের অর্ডার পেজ";
const landingDescription =
  "OrderKoro (Order Koro) - ফেসবুক ও এফ-কমার্স সেলারদের জন্য এক পণ্যের সুপারফাস্ট ক্যাশ অন ডেলিভারি অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে সহজে অর্ডার করতে পারে।";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: landingTitle,
  description: landingDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: landingTitle,
    description: landingDescription,
    url: "/",
    siteName: "OrderKoro",
    locale: "bn_BD",
    type: "website",
    images: [
      {
        url: "/brand/og-orderkoro-v1.jpg",
        width: 1200,
        height: 630,
        alt: "OrderKoro - Order Koro Storefront",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: landingTitle,
    description: landingDescription,
    images: ["/brand/og-orderkoro-v1.jpg"],
  },
};

export default function HomePage() {
  const contactUrl = process.env.NEXT_PUBLIC_CONTACT_URL?.trim() || "";
  const demoAlertsUrl = process.env.NEXT_PUBLIC_DEMO_ALERTS_URL?.trim() || "";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "OrderKoro",
        alternateName: [
          "Order Koro",
          "OrderKoro Bangladesh",
          "অর্ডার করো",
          "অর্ডারকরো",
          "orderkoro.vercel.app",
        ],
        description: landingDescription,
        inLanguage: ["bn-BD", "en-US"],
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "OrderKoro",
        alternateName: ["Order Koro", "অর্ডার করো"],
        url: siteUrl,
        logo: `${siteUrl}/brand/icons/icon-512.png`,
        sameAs: [
          "https://t.me/OrderKoro_Bot",
          "https://m.me/61596152341071",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+8801843821277",
          contactType: "customer service",
          areaServed: "BD",
          availableLanguage: ["Bengali", "English"],
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <LandingHeader />
      <LandingBody contactUrl={contactUrl} demoAlertsUrl={demoAlertsUrl} />
    </>
  );
}
