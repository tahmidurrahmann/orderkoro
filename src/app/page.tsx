import type { Metadata } from "next";
import { LANDING_COPY } from "@/lib/landing-copy";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingBody } from "@/components/landing/LandingBody";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.vercel.app";
const landingTitle = "OrderKoro";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: landingTitle,
  description: LANDING_COPY.meta.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: landingTitle,
    description: LANDING_COPY.meta.description,
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
    title: landingTitle,
    description: LANDING_COPY.meta.description,
    images: ["/brand/og-orderkoro-v1.jpg"],
  },
};

export default function HomePage() {
  const contactUrl = process.env.NEXT_PUBLIC_CONTACT_URL?.trim() || "";
  const demoAlertsUrl = process.env.NEXT_PUBLIC_DEMO_ALERTS_URL?.trim() || "";

  return (
    <>
      <LandingHeader />
      <LandingBody contactUrl={contactUrl} demoAlertsUrl={demoAlertsUrl} />
    </>
  );
}
