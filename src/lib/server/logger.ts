import "server-only";

import { maskPhoneForLog } from "@/lib/phone";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  orderNumber?: string;
  slug?: string;
  phone?: string;
  durationMs?: number;
  channel?: string;
  error?: string | Error;
  [key: string]: unknown;
}

function sanitizeContext(ctx?: LogContext): Record<string, unknown> {
  if (!ctx) return {};
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(ctx)) {
    // Never log PII
    if (["name", "customerName", "address", "customerAddress", "fullAddress"].includes(key)) {
      continue;
    }
    // Never log raw secrets
    if (["token", "privateKey", "secret", "botToken", "sheetId", "telegramChatId"].includes(key)) {
      continue;
    }
    if (key === "phone" && typeof value === "string") {
      cleaned[key] = maskPhoneForLog(value);
      continue;
    }
    if (value instanceof Error) {
      cleaned[key] = {
        name: value.name,
        message: value.message,
        stack: process.env.NODE_ENV !== "production" ? value.stack : undefined,
      };
      continue;
    }
    cleaned[key] = value;
  }

  return cleaned;
}

function log(level: LogLevel, message: string, ctx?: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeContext(ctx),
  };

  const str = JSON.stringify(entry);
  if (level === "error") {
    console.error(str);
  } else if (level === "warn") {
    console.warn(str);
  } else {
    console.log(str);
  }
}

export const logger = {
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
};
