import demoBrandRaw from "../../clients/demo-brand.json";
import {
  type ClientConfig,
  type PublicClientConfig,
  ClientConfigSchema,
  toPublicClientConfig,
  validateClientCollection,
} from "./config-schema";

/**
 * Portable Client Registry
 * Validated at module evaluation (build time) and on every lookup (request time)
 * without requiring runtime Node `fs` access on Edge/Cloudflare runtimes.
 */
const RAW_CLIENTS: unknown[] = [demoBrandRaw];

const VALIDATED_CLIENTS: ClientConfig[] = validateClientCollection(RAW_CLIENTS);

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
