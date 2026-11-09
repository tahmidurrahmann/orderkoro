import type { Metadata, Viewport } from "next";
import { Anek_Bangla } from "next/font/google";
import "./globals.css";
import "@/styles/brand-tokens.css";
import { Analytics } from "@vercel/analytics/next";

const anekBangla = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-anek-bangla",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.shop";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OrderKoro (Order Koro) | অর্ডার করো",
    template: "%s | OrderKoro",
  },
  description:
    "OrderKoro (Order Koro) - ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে এবং নিজের গুগল শিটে জমা হয়।",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/icons/apple-touch-icon.png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "OrderKoro",
    description:
      "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে এবং নিজের গুগল শিটে জমা হয়।",
    url: "/",
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
    title: "OrderKoro",
    description:
      "ফেসবুক সেলারদের জন্য এক পণ্যের অর্ডার পেজ। কাস্টমার সাইজ ও কালার বেছে অর্ডার করে। অর্ডার সাথে সাথে আপনার টেলিগ্রামে আসে এবং নিজের গুগল শিটে জমা হয়।",
    images: ["/brand/og-orderkoro-v1.jpg"],
  },
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F4F0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      translate="no"
      suppressHydrationWarning
      className={`notranslate ${anekBangla.variable}`}
    >
      <body
        translate="no"
        suppressHydrationWarning
        className="notranslate min-h-screen-safe bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-[var(--brand-primary)] selection:text-white"
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
