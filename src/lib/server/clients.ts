import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  ClientConfigSchema,
  toPublicClientConfig as baseToPublicClientConfig,
  type ClientConfig,
  type ServerClientSecrets,
} from "@/lib/config-schema";
import { getServerEnv } from "./env";

export { baseToPublicClientConfig as toPublicClientConfig };

const CLIENTS_DIR = path.resolve(process.cwd(), "clients");
const clientConfigCache = new Map<string, ClientConfig>();

export function validateAdminTelegramChatId(): void {
  const adminChatId = (process.env.ADMIN_TELEGRAM_CHAT_ID || "").trim();
  if (!adminChatId) {
    throw new Error("Missing required environment variable: ADMIN_TELEGRAM_CHAT_ID");
  }

  if (!fs.existsSync(CLIENTS_DIR)) return;
  const files = fs.readdirSync(CLIENTS_DIR).filter((f) => f.endsWith(".json"));
  const normalizedAdmin = adminChatId.replace(/^-100/, "-");

  for (const f of files) {
    const slug = path.basename(f, ".json");
    const filePath = path.join(CLIENTS_DIR, f);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const clientChat = String(parsed.telegramChatId || "").trim();
      if (clientChat) {
        const normalizedClient = clientChat.replace(/^-100/, "-");
        if (normalizedAdmin === normalizedClient) {
          throw new Error(
            `ADMIN_TELEGRAM_CHAT_ID (${adminChatId}) must not equal client "${slug}" telegramChatId (${clientChat}). Admin alerts must never be sent to a seller group.`
          );
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("ADMIN_TELEGRAM_CHAT_ID")) {
        throw e;
      }
    }
  }
}

export function getServerClientConfig(slug: string): ClientConfig | null {
  getServerEnv();
  validateClientOrderPrefixes();
  validateAdminTelegramChatId();

  if (clientConfigCache.has(slug)) {
    return clientConfigCache.get(slug)!;
  }

  const filePath = path.join(CLIENTS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = ClientConfigSchema.parse(parsed);

    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProduction && validated.testOnly) {
      return null;
    }

    clientConfigCache.set(slug, validated);
    return validated;
  } catch (err) {
    console.error(`[ServerClients] Failed to load server client config for slug: ${slug}`, err);
    return null;
  }
}

export function getAllServerClients(): ClientConfig[] {
  if (!fs.existsSync(CLIENTS_DIR)) {
    return [];
  }
  validateClientOrderPrefixes();
  const files = fs.readdirSync(CLIENTS_DIR).filter((f) => f.endsWith(".json"));
  const clients: ClientConfig[] = [];
  for (const f of files) {
    const slug = path.basename(f, ".json");
    const cfg = getServerClientConfig(slug);
    if (cfg) {
      clients.push(cfg);
    }
  }
  return clients;
}

export function validateClientOrderPrefixes(): void {
  if (!fs.existsSync(CLIENTS_DIR)) return;
  const files = fs.readdirSync(CLIENTS_DIR).filter((f) => f.endsWith(".json"));
  const prefixMap = new Map<string, string>();
  for (const f of files) {
    const slug = path.basename(f, ".json");
    const filePath = path.join(CLIENTS_DIR, f);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const prefix = String(parsed.orderPrefix || "").toUpperCase();
      if (prefix) {
        if (prefixMap.has(prefix) && prefixMap.get(prefix) !== slug) {
          throw new Error(
            `Duplicate orderPrefix "${prefix}" detected: used by both "${prefixMap.get(prefix)}" and "${slug}". Each client must have a unique orderPrefix.`
          );
        }
        prefixMap.set(prefix, slug);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Duplicate orderPrefix")) {
        throw e;
      }
    }
  }
}

export function getServerClientByOrderPrefix(orderPrefix: string): ClientConfig | null {
  const all = getAllServerClients();
  return all.find((c) => c.orderPrefix === orderPrefix) || null;
}

export function getServerClientSecrets(slug: string): ServerClientSecrets | null {
  const cfg = getServerClientConfig(slug);
  if (!cfg) return null;
  return {
    sheetId: cfg.sheetId,
    telegramChatId: cfg.telegramChatId,
    highValueThreshold: cfg.highValueThreshold,
    previewToken: cfg.previewToken,
    demoMode: cfg.demoMode,
    sellerTelegramUserId: cfg.sellerTelegramUserId,
  };
}
