import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingBody } from "@/components/landing/LandingBody";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.shop";
const landingTitle =
  "OrderKoro (Order Koro) | অর্ডার করো - ফেসবুক সেলারদের অর্ডার পেজ";
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
        sameAs: ["https://t.me/OrderKoro_Bot", "https://m.me/61596152341071"],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+8801843821277",
          contactType: "customer service",
          areaServed: "BD",
          availableLanguage: ["Bengali", "English"],
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "OrderKoro",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "1999",
          priceCurrency: "BDT",
          priceValidUntil: "2027-12-31",
        },
        description:
          "High-converting single-product Cash on Delivery order page engine with automated Google Sheets sync and Telegram bot order management for Bangladeshi Facebook sellers.",
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "OrderKoro কী এবং এটি কীভাবে কাজ করে?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "OrderKoro হলো ফেসবুক ও এফ-কমার্স সেলারদের জন্য তৈরি এক পণ্যের সুপারফাস্ট অর্ডার পেজ। কাস্টমার নিজে নাম, ঠিকানা, সাইজ ও কালার সিলেক্ট করে অর্ডার কনফার্ম করে। অর্ডার আসার সাথে সাথে সেলারের টেলিগ্রামে মেসেজ চলে যায় এবং নিজস্ব গুগল শিটে সব ডাটা স্বয়ংক্রিয়ভাবে সেভ হয়।",
            },
          },
          {
            "@type": "Question",
            name: "OrderKoro-র সেটআপ ফি কত?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "OrderKoro-র সার্ভিস ফি ১,৯৯৯ টাকা, যা একবারই দিতে হয়। কোনো অতিরিক্ত মাসিক চার্জ নেই। পেজ তৈরি করার পর দেখে পছন্দ হলে ফি পরিশোধ করতে হয়।",
            },
          },
          {
            "@type": "Question",
            name: "OrderKoro-তে কোন কোন পেমেন্ট মেথড সাপোর্ট করে?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "OrderKoro সম্পূর্ণ ক্যাশ অন ডেলিভারি (COD) এবং বিকাশ, নগদ ও রকেটে অগ্রিম পেমেন্ট সাপোর্ট করে।",
            },
          },
        ],
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
