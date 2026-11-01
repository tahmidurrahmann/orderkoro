import type { ClientConfig, PublicClientConfig } from "./config-schema";

export type ConfigWithDelivery = ClientConfig | PublicClientConfig;

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
export function hasDhakaSuburbZone(config: ConfigWithDelivery): string | null {
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
  config: ConfigWithDelivery,
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
  config: ConfigWithDelivery,
  quantity: number,
  district: string | "",
  dhakaArea: DhakaAreaChoice = "city"
) {
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

export type OrderTotals = ReturnType<typeof calculateOrderTotals>;

export interface ServerOrderVerificationInput {
  district: string;
  zone: string;
  color: string;
  size: string;
  quantity: number;
}

export type ServerOrderVerificationResult =
  | {
      ok: true;
      data: {
        unitPrice: number;
        quantity: number;
        subtotal: number;
        deliveryFee: number;
        codTotal: number;
        colorName: string;
        colorId: string;
        sizeName: string;
        zoneId: string;
        zoneLabel: string | { bn: string; en: string };
      };
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      message: string;
    };

export function verifyAndRecomputeOrderOnServer(
  config: ConfigWithDelivery,
  input: ServerOrderVerificationInput
): ServerOrderVerificationResult {
  const fieldErrors: Record<string, string> = {};

  // 0. Sold-out or effectively sold out check
  if (
    config.soldOut ||
    (config.sizes.length > 0 && config.sizes.every((s) => !s.available)) ||
    (config.colors.length > 0 && config.colors.every((c) => c.available === false))
  ) {
    return {
      ok: false,
      fieldErrors: { product: "Product is sold out" },
      message: "This product is currently sold out.",
    };
  }

  // 1. Color validation (accept by id, or English/Bangla name, and must be available)
  const colorMatch = config.colors.find((c) => {
    const rawInput = input.color.trim().toLowerCase();
    const id = (c.id || "").toLowerCase();
    const enName = typeof c.name === "string" ? c.name.toLowerCase() : c.name.en.toLowerCase();
    const bnName = typeof c.name === "string" ? c.name.toLowerCase() : c.name.bn.toLowerCase();
    return rawInput === id || rawInput === enName || rawInput === bnName;
  });

  if (!colorMatch) {
    fieldErrors.color = `Invalid color "${input.color}". Available colors: ${config.colors
      .map((c) => (typeof c.name === "string" ? c.name : c.name.en))
      .join(", ")}`;
  } else if (colorMatch.available === false) {
    const cName = typeof colorMatch.name === "string" ? colorMatch.name : colorMatch.name.en;
    fieldErrors.color = `Color "${cName}" is unavailable. Please select another color.`;
  }

  // 2. Size validation (must exist and available === true)
  const sizeMatch = config.sizes.find(
    (s) => s.name.trim().toLowerCase() === input.size.trim().toLowerCase()
  );

  if (!sizeMatch) {
    fieldErrors.size = `Invalid size "${input.size}"`;
  } else if (!sizeMatch.available) {
    fieldErrors.size = `Size "${sizeMatch.name}" is sold out. Please select another size.`;
  }

  // 3. Quantity validation
  const safeQty = Math.floor(input.quantity);
  if (isNaN(safeQty) || safeQty < 1 || safeQty > config.maxQuantity) {
    fieldErrors.quantity = `Quantity must be between 1 and ${config.maxQuantity}`;
  }

  // 4. District and Zone validation
  const suburbZoneId = hasDhakaSuburbZone(config);
  const districtZoneMap = config.delivery.districtZoneMap || {};
  const defaultZoneId = config.delivery.defaultZoneId;

  // Expected zone for the district
  const allowedZoneIds: string[] = [];
  if (input.district === "Dhaka") {
    allowedZoneIds.push("dhaka-city");
    if (suburbZoneId) {
      allowedZoneIds.push(suburbZoneId);
    }
  } else if (districtZoneMap[input.district]) {
    allowedZoneIds.push(districtZoneMap[input.district]);
  } else {
    allowedZoneIds.push(defaultZoneId);
  }

  if (!allowedZoneIds.includes(input.zone)) {
    fieldErrors.zone = `Invalid delivery zone "${input.zone}" for district "${input.district}". Expected: ${allowedZoneIds.join(
      " or "
    )}`;
  }

  const zoneMatch = config.delivery.zones.find((z) => z.id === input.zone);
  if (!zoneMatch) {
    fieldErrors.zone = `Zone "${input.zone}" not found in configured delivery zones`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      message: "Order verification failed due to invalid options or unavailable stock",
    };
  }

  // Server pricing calculations
  const unitPrice = config.product.price;
  const subtotal = unitPrice * safeQty;
  const isFreeDelivery =
    typeof config.delivery.freeDeliveryAbove === "number" &&
    subtotal >= config.delivery.freeDeliveryAbove;

  const deliveryFee = isFreeDelivery ? 0 : zoneMatch!.charge;
  const codTotal = subtotal + deliveryFee;

  return {
    ok: true,
    data: {
      unitPrice,
      quantity: safeQty,
      subtotal,
      deliveryFee,
      codTotal,
      colorName: typeof colorMatch!.name === "string" ? colorMatch!.name : colorMatch!.name.en,
      colorId: colorMatch!.id || "default",
      sizeName: sizeMatch!.name,
      zoneId: zoneMatch!.id,
      zoneLabel: zoneMatch!.label,
    },
  };
}
