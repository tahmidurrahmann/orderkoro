import type { ClientConfig } from "./config-schema";

export type DhakaAreaChoice = "city" | "suburb";

export interface DeliveryResolution {
  zoneId: string;
  label: string | { bn: string; en: string };
  baseCharge: number;
  effectiveCharge: number;
  isFreeDelivery: boolean;
  daysMin: number;
  daysMax: number;
  requiresDhakaSuburbChoice: boolean;
}

/**
 * Checks whether a client config defines a separate suburb zone for Dhaka.
 */
export function hasDhakaSuburbZone(config: ClientConfig): string | null {
  if (config.delivery.suburbZoneId) {
    return config.delivery.suburbZoneId;
  }
  const suburbZone = config.delivery.zones.find((z) =>
    z.id.toLowerCase().includes("suburb")
  );
  return suburbZone ? suburbZone.id : null;
}

/**
 * Resolves the delivery zone, charge, and day range for a selected district, Dhaka area choice, and subtotal.
 */
export function resolveDeliveryQuote(
  config: ClientConfig,
  district: string | "",
  dhakaArea: DhakaAreaChoice,
  subtotal: number
): DeliveryResolution | null {
  if (!district) {
    return null;
  }

  const suburbZoneId = hasDhakaSuburbZone(config);
  const requiresDhakaSuburbChoice = district === "Dhaka" && Boolean(suburbZoneId);

  let targetZoneId: string;
  if (district === "Dhaka" && suburbZoneId && dhakaArea === "suburb") {
    targetZoneId = suburbZoneId;
  } else if (config.delivery.districtZoneMap?.[district]) {
    targetZoneId = config.delivery.districtZoneMap[district];
  } else {
    targetZoneId = config.delivery.defaultZoneId;
  }

  const zone =
    config.delivery.zones.find((z) => z.id === targetZoneId) ??
    config.delivery.zones.find((z) => z.id === config.delivery.defaultZoneId) ??
    config.delivery.zones[0];

  const isFreeDelivery =
    typeof config.delivery.freeDeliveryAbove === "number" &&
    subtotal >= config.delivery.freeDeliveryAbove;

  const effectiveCharge = isFreeDelivery ? 0 : zone.charge;

  return {
    zoneId: zone.id,
    label: zone.label,
    baseCharge: zone.charge,
    effectiveCharge,
    isFreeDelivery,
    daysMin: zone.daysMin,
    daysMax: zone.daysMax,
    requiresDhakaSuburbChoice,
  };
}

/**
 * Server-safe and client-safe order pricing computation
 */
export function calculateOrderTotals(
  config: ClientConfig,
  quantity: number,
  district: string | "",
  dhakaArea: DhakaAreaChoice = "city"
): {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  delivery: DeliveryResolution | null;
  total: number;
} {
  const safeQty = Math.max(1, Math.min(config.maxQuantity, Math.floor(quantity)));
  const unitPrice = config.product.price;
  const subtotal = unitPrice * safeQty;
  const delivery = resolveDeliveryQuote(config, district, dhakaArea, subtotal);
  const total = subtotal + (delivery ? delivery.effectiveCharge : 0);

  return {
    unitPrice,
    quantity: safeQty,
    subtotal,
    delivery,
    total,
  };
}
