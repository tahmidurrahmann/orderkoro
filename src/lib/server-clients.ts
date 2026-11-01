import "server-only";
import { getClientBySlug, getClientByOrderPrefix, getAllClients } from "./clients";
import type { ClientConfig, ServerClientSecrets } from "./config-schema";

export function getServerClientConfig(slug: string): ClientConfig | null {
  return getClientBySlug(slug);
}

export function getServerClientByOrderPrefix(prefix: string): ClientConfig | null {
  return getClientByOrderPrefix(prefix);
}

export function getServerClientSecrets(slug: string): ServerClientSecrets | null {
  const client = getClientBySlug(slug);
  if (!client) return null;
  return {
    sheetId: client.sheetId,
    telegramChatId: client.telegramChatId,
  };
}

export function getAllServerClients(): ClientConfig[] {
  return getAllClients();
}
