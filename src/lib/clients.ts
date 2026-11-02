import demoBrandRaw from "../../clients/demo-brand.json";
import testTemplateRaw from "../../clients/test-template.json";
import {
  type ClientConfig,
  type PublicClientConfig,
  ClientConfigSchema,
  toPublicClientConfig,
  validateClientCollection,
} from "./config-schema";

const isProduction =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production");

const RAW_CLIENTS: unknown[] = [demoBrandRaw, testTemplateRaw];

const ALL_VALIDATED_CLIENTS: ClientConfig[] = validateClientCollection(RAW_CLIENTS);

const VALIDATED_CLIENTS: ClientConfig[] = isProduction
  ? ALL_VALIDATED_CLIENTS.filter((c) => !c.testOnly)
  : ALL_VALIDATED_CLIENTS;

const CLIENT_BY_SLUG = new Map<string, ClientConfig>(
  VALIDATED_CLIENTS.map((c) => [c.slug, c])
);

const CLIENT_BY_PREFIX = new Map<string, ClientConfig>(
  VALIDATED_CLIENTS.map((c) => [c.orderPrefix, c])
);

export function getAllClients(): ClientConfig[] {
  return VALIDATED_CLIENTS;
}

export function getAllPublicClients(): PublicClientConfig[] {
  return VALIDATED_CLIENTS.map(toPublicClientConfig);
}

export function getClientBySlug(slug: string): ClientConfig | null {
  const existing = CLIENT_BY_SLUG.get(slug);
  if (!existing) {
    return null;
  }
  // Re-validate at request time as required by spec
  return ClientConfigSchema.parse(existing);
}

export function getPublicClientBySlug(slug: string): PublicClientConfig | null {
  const full = getClientBySlug(slug);
  return full ? toPublicClientConfig(full) : null;
}

export function getClientByOrderPrefix(prefix: string): ClientConfig | null {
  return CLIENT_BY_PREFIX.get(prefix.toUpperCase()) ?? null;
}
