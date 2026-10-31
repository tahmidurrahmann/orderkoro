import * as z from "zod";
import { ensureAccessiblePrimaryColor, isValidHexColor, normalizeHex } from "./contrast";
import { DISTRICT_IDS } from "./districts";
import type { CopyDictionary } from "./i18n";

/**
 * Localized text field: accepts either a plain string or { bn, en } object
 * so single-language sellers can write a plain string while bilingual sellers
 * can provide both Bangla and English strings.
 */
export const LocalizedStringSchema = z.union([
  z.string({ error: "Text is required" }).min(1, { error: "Text cannot be empty" }),
  z.object({
    bn: z.string({ error: "Bangla text is required" }).min(1, { error: "Bangla text cannot be empty" }),
    en: z.string({ error: "English text is required" }).min(1, { error: "English text cannot be empty" }),
  }),
]);

export const HexColorSchema = z
  .string({ error: "Hex color is required" })
  .refine((val) => isValidHexColor(val), {
    error: "Must be a valid hex color (#RGB or #RRGGBB)",
  })
  .transform((val) => normalizeHex(val));

export const ColorOptionSchema = z.object({
  id: z.string().min(1).optional(),
  name: LocalizedStringSchema,
  hex: HexColorSchema,
  images: z
    .array(z.string().min(1), {
      error: "Each color must define an images array",
    })
    .min(1, { error: "Every color must have at least 1 image" }),
});

export const SizeOptionSchema = z.object({
  name: z.string({ error: "Size name is required" }).min(1, { error: "Size name cannot be empty" }),
  available: z.boolean({ error: "Size availability boolean is required" }),
});

export const DeliveryZoneSchema = z
  .object({
    id: z.string().min(1, { error: "Zone id cannot be empty" }),
    label: LocalizedStringSchema,
    charge: z.number().int().min(0, { error: "Delivery charge cannot be negative" }),
    daysMin: z.number().int().min(1, { error: "daysMin must be at least 1" }),
    daysMax: z.number().int().min(1, { error: "daysMax must be at least 1" }),
  })
  .refine((zItem) => zItem.daysMax >= zItem.daysMin, {
    error: "Delivery zone daysMax must be greater than or equal to daysMin",
    path: ["daysMax"],
  });

export const ClientConfigSchema = z
  .object({
    slug: z
      .string({ error: "slug is required" })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: "slug must be lowercase alphanumeric with hyphens (e.g. demo-brand)",
      }),
    orderPrefix: z
      .string({ error: "orderPrefix is required" })
      .regex(/^[A-Z]{2,4}$/, {
        error: "orderPrefix must be 2 to 4 uppercase letters (e.g. BNN)",
      }),
    brand: z.object({
      name: LocalizedStringSchema,
      logoUrl: LocalizedStringSchema,
      primaryColor: HexColorSchema,
      accentColor: HexColorSchema.optional(),
    }),
    language: z.object({
      default: z.enum(["bn", "en"]),
      allowSwitch: z.boolean(),
    }),
    product: z
      .object({
        title: LocalizedStringSchema,
        price: z.number().int().positive({ error: "product.price must be a positive integer" }),
        oldPrice: z.number().int().positive().optional(),
        shortDescription: LocalizedStringSchema,
        details: z.array(LocalizedStringSchema).optional(),
        images: z
          .array(z.string().min(1))
          .min(3, { error: "product.images must contain at least 3 images" })
          .max(8, { error: "product.images can contain at most 8 images" }),
        sizeChartImage: z.string().min(1).optional(),
      })
      .refine(
        (prod) => prod.oldPrice === undefined || prod.oldPrice > prod.price,
        {
          error: "product.oldPrice must be strictly greater than product.price when provided",
          path: ["oldPrice"],
        }
      ),
    colors: z
      .array(ColorOptionSchema)
      .min(1, { error: "colors must contain at least 1 color" })
      .max(6, { error: "colors can contain at most 6 colors" }),
    sizes: z
      .array(SizeOptionSchema)
      .min(1, { error: "sizes must contain at least 1 size" }),
    maxQuantity: z
      .number()
      .int()
      .min(1, { error: "maxQuantity must be at least 1" })
      .max(5, { error: "maxQuantity cannot exceed 5" })
      .default(5),
    soldOut: z.boolean(),
    delivery: z
      .object({
        zones: z
          .array(DeliveryZoneSchema)
          .min(1, { error: "delivery.zones cannot be empty" }),
        districtZoneMap: z.record(z.string(), z.string()).optional(),
        suburbZoneId: z.string().min(1).optional(),
        defaultZoneId: z.string().min(1, { error: "delivery.defaultZoneId is required" }),
        freeDeliveryAbove: z.number().int().positive().optional(),
        courierNote: LocalizedStringSchema.optional(),
      })
      .superRefine((del, ctx) => {
        const zoneIds = new Set(del.zones.map((zItem) => zItem.id));
        if (!zoneIds.has(del.defaultZoneId)) {
          ctx.addIssue({
            code: "custom",
            path: ["defaultZoneId"],
            message: `delivery.defaultZoneId "${del.defaultZoneId}" does not match any id in delivery.zones`,
          });
        }
        if (del.suburbZoneId && !zoneIds.has(del.suburbZoneId)) {
          ctx.addIssue({
            code: "custom",
            path: ["suburbZoneId"],
            message: `delivery.suburbZoneId "${del.suburbZoneId}" does not match any id in delivery.zones`,
          });
        }
        if (del.districtZoneMap) {
          for (const [district, mappedZoneId] of Object.entries(del.districtZoneMap)) {
            if (!DISTRICT_IDS.has(district)) {
              ctx.addIssue({
                code: "custom",
                path: ["districtZoneMap", district],
                message: `Unknown Bangladesh district "${district}" in delivery.districtZoneMap`,
              });
            }
            if (!zoneIds.has(mappedZoneId)) {
              ctx.addIssue({
                code: "custom",
                path: ["districtZoneMap", district],
                message: `Mapped zone "${mappedZoneId}" for district "${district}" does not exist in delivery.zones`,
              });
            }
          }
        }
      }),
    returnPolicyText: LocalizedStringSchema,
    contact: z.object({
      phone: z.string().min(6, { error: "contact.phone is required" }),
      messengerPageUsername: z
        .string()
        .min(1, { error: "contact.messengerPageUsername is required" }),
    }),
    sheetId: z.string().min(1, { error: "sheetId is required" }),
    telegramChatId: z.string().min(1, { error: "telegramChatId is required" }),
    pixelId: z
      .string()
      .regex(/^\d{8,20}$/, { error: "pixelId must be a numeric Meta Pixel ID" })
      .optional(),
    confirmationMode: z.enum(["call", "tap"]),
    highValueThreshold: z.number().int().positive().optional(),
    ogImage: z.string().min(1).optional(),
    showPoweredBy: z.boolean().default(true),
    copy: z
      .object({
        bn: z.record(z.string(), z.string()).optional(),
        en: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
  })
  .transform((cfg) => {
    const contrastCheck = ensureAccessiblePrimaryColor(
      cfg.brand.primaryColor,
      `clients/${cfg.slug}.json`
    );
    return {
      ...cfg,
      brand: {
        ...cfg.brand,
        primaryColor: contrastCheck.color,
        originalPrimaryColor: contrastCheck.originalColor,
        primaryColorContrast: contrastCheck.contrast,
        primaryColorWasAdjusted: contrastCheck.wasAdjusted,
      },
      copy: cfg.copy as
        | { bn?: Partial<CopyDictionary>; en?: Partial<CopyDictionary> }
        | undefined,
    };
  });

export type ClientConfigInput = z.input<typeof ClientConfigSchema>;
export type ClientConfig = z.output<typeof ClientConfigSchema>;

/**
 * Validates a collection of client configs and ensures no duplicate `slug` or `orderPrefix` collisions exist.
 */
export function validateClientCollection(rawConfigs: unknown[]): ClientConfig[] {
  const parsedConfigs: ClientConfig[] = [];
  const seenSlugs = new Map<string, string>();
  const seenPrefixes = new Map<string, string>();

  for (const raw of rawConfigs) {
    const res = ClientConfigSchema.safeParse(raw);
    if (!res.success) {
      const slugHint =
        typeof raw === "object" && raw !== null && "slug" in raw
          ? String((raw as Record<string, unknown>).slug)
          : "unknown";
      const formatted = res.error.issues
        .map((iss) => `  - ${iss.path.join(".") || "(root)"}: ${iss.message}`)
        .join("\n");
      throw new Error(`Invalid client config [${slugHint}]:\n${formatted}`);
    }

    const cfg = res.data;
    if (seenSlugs.has(cfg.slug)) {
      throw new Error(`Duplicate client slug "${cfg.slug}" found.`);
    }
    seenSlugs.set(cfg.slug, cfg.slug);

    const existingSlugForPrefix = seenPrefixes.get(cfg.orderPrefix);
    if (existingSlugForPrefix) {
      throw new Error(
        `Order prefix collision: orderPrefix "${cfg.orderPrefix}" in client "${cfg.slug}" collides with client "${existingSlugForPrefix}".`
      );
    }
    seenPrefixes.set(cfg.orderPrefix, cfg.slug);

    parsedConfigs.push(cfg);
  }

  return parsedConfigs;
}
