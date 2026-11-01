import type { Metadata, Viewport } from "next";
import { Anek_Bangla } from "next/font/google";
import "./globals.css";

const anekBangla = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-anek-bangla",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "OrderKoro | Single-Product Cash on Delivery Storefront",
  description:
    "Fast, mobile-first Bangla & English Cash on Delivery order page for Bangladeshi Facebook sellers.",
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
      </body>
    </html>
  );
}
