import React from "react";
import type { PublicClientConfig } from "@/lib/config-schema";
import { resolveLocalizedText } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

interface ProductJsonLdProps {
  config: PublicClientConfig;
}

export default function ProductJsonLd({ config }: ProductJsonLdProps) {
  const lang = config.language.default;
  const title = resolveLocalizedText(config.product.title, lang);
  const description = resolveLocalizedText(config.product.shortDescription, lang);
  const brandName = resolveLocalizedText(config.brand.name, lang);
  const pageUrl = getSiteUrl(`/${config.slug}`).toString();

  // Map image paths to absolute URLs
  const images = (config.product.images || []).map((img) =>
    img.startsWith("http://") || img.startsWith("https://")
      ? img
      : getSiteUrl(img).toString(),
  );

  const isSoldOut = config.soldOut === true;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    image: images,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "BDT",
      price: config.product.price,
      priceValidUntil: "2027-12-31",
      availability: isSoldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: brandName,
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory: config.returnPolicy?.return?.enabled
          ? "https://schema.org/MerchantReturnFiniteReturnWindow"
          : "https://schema.org/MerchantReturnNotPermitted",
        merchantReturnDays: config.returnPolicy?.return?.enabled
          ? config.returnPolicy.return.days
          : 0,
        returnShippingFeesAmount: {
          "@type": "MonetaryAmount",
          currency: "BDT",
          value: config.delivery?.zones?.[0]?.charge ?? 70,
        },
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
