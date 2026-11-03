import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPublicClientBySlug } from "@/lib/clients";
import { getServerClientConfig } from "@/lib/server/clients";
import {
  checkIpRateLimit,
  getOrderMeta,
  getOrderToken,
  getRedisDriver,
} from "@/lib/server/redis";
import OrderStatusClient from "@/components/OrderStatusClient";
import type { SupportedLocale } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";
import { getSellerFavicon } from "@/lib/seller-brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface OrderStatusPageProps {
  params: Promise<{
    slug: string;
    token: string;
  }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orderkoro.vercel.app";

export async function generateMetadata({
  params,
}: OrderStatusPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getPublicClientBySlug(slug);
  const brandName = config ? resolveLocalizedText(config.brand.name, config.language.default) : "Store";
  const ogImage = config ? (config.ogImage || config.product.images[0]) : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title: config ? `Order Status | ${brandName}` : "Order Status",
    icons: config ? [{ url: getSellerFavicon(config) }] : undefined,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title: config ? `Order Status | ${brandName}` : "Order Status",
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: config ? `Order Status | ${brandName}` : "Order Status",
      images: ogImage ? [ogImage] : [],
    },
  };
}

/**
 * Masks phone number to first 3 and last 3 digits (e.g. 017***678).
 */
function maskPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length <= 6) return digits;
  const first3 = digits.slice(0, 3);
  const last3 = digits.slice(-3);
  return `${first3}***${last3}`;
}

export default async function OrderStatusPage({ params }: OrderStatusPageProps) {
  const { slug, token } = await params;

  // 1. Per-IP Rate Limiting (60 requests per minute)
  const headerList = await headers();
  const clientIp =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "127.0.0.1";

  const redis = getRedisDriver();
  const rateLimit = await checkIpRateLimit(clientIp, redis, 60, 60, "status_page");
  if (!rateLimit.allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-rose-600">
          Too many requests. Please wait a minute and refresh.
        </p>
      </div>
    );
  }

  // 2. Lookup Token in Redis
  const tokenRecord = await getOrderToken(token, redis);
  if (!tokenRecord || tokenRecord.slug !== slug) {
    notFound();
  }

  // 3. Lookup Order Metadata in Redis
  const meta = await getOrderMeta(tokenRecord.orderNumber, redis);
  if (!meta || meta.slug !== slug) {
    notFound();
  }

  // 4. Lookup Public Client Config & Server Config
  const config = getPublicClientBySlug(slug);
  if (!config) {
    notFound();
  }
  const serverConfig = getServerClientConfig(slug);

  // 5. Construct Safe Customer Area (Never the full address)
  const zoneLabel = meta.zoneLabel || meta.zone || "";
  const area = meta.district
    ? zoneLabel && zoneLabel !== meta.district
      ? `${meta.district} (${zoneLabel})`
      : meta.district
    : zoneLabel;

  // 6. Check High-Value / Repeat Order flag
  const isHighValue =
    typeof serverConfig?.highValueThreshold === "number" &&
    (meta.total ?? 0) >= serverConfig.highValueThreshold;
  const isRepeatPhone = Boolean(meta.repeatPhoneFlag);
  const isHighValueOrRepeat = isHighValue || isRepeatPhone;

  const defaultProductTitle =
    typeof config.product.title === "string"
      ? config.product.title
      : config.product.title[config.language.default] ||
        config.product.title.bn ||
        config.product.title.en ||
        "";

  return (
    <OrderStatusClient
      slug={slug}
      token={token}
      orderNumber={tokenRecord.orderNumber}
      status={meta.status || "new"}
      paymentMethod={meta.paymentMethod}
      paymentStatus={meta.paymentStatus}
      customerConfirmed={Boolean(meta.customerConfirmed)}
      productTitle={meta.productTitle || defaultProductTitle}
      color={meta.color || ""}
      size={meta.size || ""}
      quantity={meta.quantity || 1}
      total={meta.total || 0}
      daysMin={meta.daysMin ?? 2}
      daysMax={meta.daysMax ?? 4}
      maskedPhone={maskPhoneNumber(meta.phone)}
      area={area}
      createdAtDhakaIso={meta.createdAtDhakaIso || new Date().toISOString()}
      sellerPhone={config.contact?.phone}
      sellerMessenger={config.contact?.messengerPageUsername}
      customerConfirmConfig={config.customerConfirm || "off"}
      isHighValueOrRepeat={isHighValueOrRepeat}
      brand={{
        name: config.brand.name,
        logoUrl: config.brand.logoUrl,
        primaryColor: config.brand.primaryColor,
      }}
      language={{
        default: config.language.default as SupportedLocale,
        allowSwitch: config.language.allowSwitch,
      }}
      copy={config.copy}
      showPoweredBy={config.showPoweredBy}
    />
  );
}
