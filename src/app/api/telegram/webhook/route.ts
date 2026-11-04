import { NextRequest, NextResponse } from "next/server";
import { getServerClientByOrderPrefix, getServerClientConfig, getServerClientSecrets } from "@/lib/server/clients";
import { logger } from "@/lib/server/logger";
import {
  acquireOrderLock,
  checkDemoTapRateLimit,
  getOrderMeta,
  getRedisDriver,
  releaseOrderLock,
  storeOrderMeta,
  updateOrderMetaStatus,
  updateOrderMetaPaymentStatus,
} from "@/lib/server/redis";
import {
  updateSheetOrderStatusWithRetry,
  updateSheetPaymentStatusWithRetry,
} from "@/lib/server/sheets";
import {
  canTransitionStatus,
  parseCallbackData,
  buildMobilePaymentInlineKeyboard,
  buildStatusInlineKeyboard,
  type OrderStatus,
} from "@/lib/server/status-machine";
import {
  answerTelegramCallback,
  editTelegramOrderMessage,
  escapeTelegramHtml,
  getAdminChatId,
  sendAdminTelegramAlert,
} from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TelegramWebhookUpdate {
  message?: {
    text?: string;
    chat: {
      id: number | string;
    };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: {
      id: number | string;
      is_bot?: boolean;
      first_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number | string;
      };
      text?: string;
    };
  };
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  no_answer: "No Answer",
  cancelled: "Cancelled",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
};

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Secret Token Header
    const secretTokenHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!expectedSecret || secretTokenHeader !== expectedSecret) {
      logger.warn("Telegram webhook unauthorized attempt: invalid or missing secret token header");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    let update: TelegramWebhookUpdate;
    try {
      update = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // 2. Handle /start command from seller
    if (update.message?.text?.trim().startsWith("/start")) {
      const chatId = String(update.message.chat.id);
      logger.info("Seller bot /start received", { chatId });
      return NextResponse.json({ ok: true, handled: "start_command", chatId });
    }

    // 3. Handle Callback Query (Inline Keyboard Buttons)
    const callbackQuery = update.callback_query;
    if (!callbackQuery || !callbackQuery.data) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const callbackQueryId = String(callbackQuery.id);
    const callbackData = String(callbackQuery.data);
    const chatId = String(callbackQuery.message?.chat?.id ?? "");
    const messageId = Number(callbackQuery.message?.message_id);
    const fromId = String(callbackQuery.from?.id ?? "");

    const parsed = parseCallbackData(callbackData);
    if (!parsed) {
      logger.warn("Telegram callback query failed to parse", { callbackData });
      await answerTelegramCallback(callbackQueryId, "Unknown action");
      return NextResponse.json({ ok: true, error: "Invalid callback format" });
    }

    const orderNumber = parsed.orderNumber;
    const redis = getRedisDriver();

    // Acquire atomic per-order lock with unique request token and 60s TTL
    const lockToken = crypto.randomUUID();
    let lockAcquired = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      lockAcquired = await acquireOrderLock(orderNumber, lockToken, 60, redis);
      if (lockAcquired) break;
      await new Promise((r) => setTimeout(r, 60));
    }

    if (!lockAcquired) {
      logger.warn("Could not acquire concurrency lock for order", { orderNumber });
      await answerTelegramCallback(callbackQueryId, "Order is being updated, please wait a moment");
      return NextResponse.json({ ok: false, error: "Order lock timeout" }, { status: 409 });
    }

    try {
      const meta = await getOrderMeta(orderNumber, redis);

      // Resolve client slug and secrets
      let slug = meta?.slug;
      if (!slug) {
        const orderPrefix = orderNumber.split("-")[0]?.toUpperCase();
        const client = orderPrefix ? getServerClientByOrderPrefix(orderPrefix) : null;
        if (client) {
          slug = client.slug;
        }
      }

      if (!slug) {
        logger.warn("Order client slug could not be resolved", { orderNumber });
        await answerTelegramCallback(callbackQueryId, "Order client not found");
        return NextResponse.json({ ok: true, error: "Order client not found" });
      }

      const secrets = getServerClientSecrets(slug);
      if (!secrets) {
        logger.error("Client config secrets missing for slug", { slug });
        await answerTelegramCallback(callbackQueryId, "Client configuration error");
        return NextResponse.json({ ok: true, error: "Client config not found" });
      }

      // 3b. Resolve demo mode and verify Chat ID equals seller's registered client telegramChatId
      const client = getServerClientConfig(slug);
      const isDemoOrder = Boolean(meta?.isDemo || secrets.demoMode || client?.demoMode);

      const clientChatId = String(meta?.telegramChatId || secrets.telegramChatId || "");
      const adminChatId = getAdminChatId();
      const normalizedChat = chatId.replace(/^-100/, "-");
      const normalizedClient = clientChatId.replace(/^-100/, "-");

      if (!clientChatId || normalizedChat !== normalizedClient) {
        logger.warn("Chat ID mismatch in callback query", {
          received: chatId,
          expected: clientChatId,
          orderNumber,
          isDemoOrder,
        });
        await answerTelegramCallback(
          callbackQueryId,
          "Unauthorized: This action can only be taken from the registered group",
          false
        );
        return NextResponse.json(
          { ok: true, error: "Unauthorized chat ID", changed: false },
          { status: 200 }
        );
      }

      // 3c. Callback security: Demo mode vs Real client
      if (isDemoOrder) {
        // Any Telegram user is allowed to tap demo orders, but rate-limit to 10 taps/min per user
        const tapLimit = await checkDemoTapRateLimit(fromId, redis);
        if (!tapLimit.allowed) {
          logger.warn("Demo tap rate limit exceeded", { fromId, count: tapLimit.count, orderNumber });
          await answerTelegramCallback(
            callbackQueryId,
            "অনেক বেশি অনুরোধ, একটু পর চেষ্টা করুন",
            false
          );
          return NextResponse.json(
            { ok: true, error: "Demo tap rate limit exceeded", rateLimited: true, changed: false },
            { status: 200 }
          );
        }
      } else {
        // Real client: only the seller may tap status buttons
        const sellerUserId =
          secrets.sellerTelegramUserId ||
          meta?.sellerTelegramUserId ||
          (!clientChatId.startsWith("-") ? clientChatId : null);

        if (sellerUserId && fromId && fromId !== sellerUserId) {
          logger.warn("Unauthorized stranger tap on real client order", {
            fromId,
            expectedSellerId: sellerUserId,
            orderNumber,
          });
          await answerTelegramCallback(
            callbackQueryId,
            "Unauthorized: Only the seller may update order status",
            false
          );
          return NextResponse.json(
            { ok: true, error: "Unauthorized user ID", changed: false },
            { status: 200 }
          );
        }
      }

      if (parsed.type === "payment") {
        const { paymentAction } = parsed;
        const targetPaymentStatus = paymentAction === "verified" ? "Verified" : "Not received";

        if (meta?.paymentMethod === "cod") {
          logger.warn("Attempted payment callback on COD order", { orderNumber });
          await answerTelegramCallback(
            callbackQueryId,
            "Invalid action: Payment verification is only available for mobile payments",
            true
          );
          return NextResponse.json({
            ok: false,
            error: "Payment verification is not applicable to Cash on Delivery orders",
            changed: false,
          });
        }

        if (meta?.paymentStatus === targetPaymentStatus) {
          await answerTelegramCallback(
            callbackQueryId,
            `Payment is already marked as ${targetPaymentStatus}`
          );
          return NextResponse.json({ ok: true, idempotent: true, paymentStatus: targetPaymentStatus });
        }

        let sheetUpdated = false;
        let sheetError: Error | null = null;
        try {
          await updateSheetPaymentStatusWithRetry(
            secrets.sheetId,
            meta?.rowRef || "",
            orderNumber,
            targetPaymentStatus
          );
          sheetUpdated = true;
        } catch (sheetErr) {
          sheetError = sheetErr as Error;
          logger.error("Failed to update Google Sheet payment status", {
            orderNumber,
            error: sheetError,
          });
        }

        await updateOrderMetaPaymentStatus(orderNumber, targetPaymentStatus, redis);

        if (!sheetUpdated) {
          await sendAdminTelegramAlert(
            adminChatId,
            `⚠️ <b>ADMIN ALERT: Webhook Payment Sheet Update Failed</b>\n` +
            `• <b>Order:</b> <code>${escapeTelegramHtml(orderNumber)}</code>\n` +
            `• <b>Payment Status:</b> ${targetPaymentStatus}\n` +
            `• <b>Error:</b> <code>${escapeTelegramHtml(sheetError?.message || "Unknown error")}</code>`
          );
        }

        await answerTelegramCallback(
          callbackQueryId,
          sheetUpdated
            ? `Payment status updated to ${targetPaymentStatus}`
            : `Payment status updated to ${targetPaymentStatus} (Sheet sync pending)`
        );

        if (messageId && callbackQuery.message?.text) {
          let updatedText = callbackQuery.message.text;
          if (/Payment Status:\s*[A-Za-z ]+/i.test(updatedText)) {
            updatedText = updatedText.replace(
              /Payment Status:\s*[A-Za-z ]+/i,
              `Payment Status: <b>${targetPaymentStatus}</b>`
            );
          } else {
            updatedText += `\n📊 <b>Payment Status:</b> <b>${targetPaymentStatus}</b>`;
          }

          if (targetPaymentStatus === "Verified") {
            updatedText = updatedText
              .replace(/⚠️\s*UNVERIFIED:[^\n]*/gi, "✅ <b>Payment Verified</b>")
              .replace(/⚠️\s*PAYMENT NOT RECEIVED/gi, "✅ <b>Payment Verified</b>")
              .replace(/\n\n\n+/g, "\n\n");
          } else if (targetPaymentStatus === "Not received") {
            updatedText = updatedText
              .replace(/⚠️\s*UNVERIFIED:[^\n]*/gi, "⚠️ <b>PAYMENT NOT RECEIVED</b>")
              .replace(/✅\s*Payment Verified/gi, "⚠️ <b>PAYMENT NOT RECEIVED</b>");
          }

          const newKeyboard =
            targetPaymentStatus === "Verified"
              ? buildStatusInlineKeyboard((meta?.status || "new") as OrderStatus, orderNumber)
              : buildMobilePaymentInlineKeyboard("Not received", orderNumber);

          try {
            await editTelegramOrderMessage(
              chatId,
              messageId,
              updatedText,
              (meta?.status || "new") as OrderStatus,
              orderNumber,
              newKeyboard
            );
          } catch (editErr) {
            logger.warn("Failed to edit Telegram order message for payment status", {
              orderNumber,
              error: editErr as Error,
            });
          }
        }

        return NextResponse.json({
          ok: true,
          orderNumber,
          paymentStatus: targetPaymentStatus,
          sheetUpdated,
        });
      }

      const action = parsed.action;
      const currentStatus = (meta?.status || "new") as OrderStatus;

      // Duplicate press / already at target status
      if (currentStatus === action) {
        // If Google Sheet previously failed to sync, retry the Sheet write!
        if (meta?.sheetSynced === false) {
          logger.info("Duplicate press detected with unsynced Google Sheet. Retrying Sheet update.", {
            orderNumber,
            status: action,
          });

          let sheetSuccess = false;
          let sheetErrMessage = "";
          try {
            await updateSheetOrderStatusWithRetry(secrets.sheetId, meta?.rowRef || "", orderNumber, action);
            sheetSuccess = true;
            meta.sheetSynced = true;
            await storeOrderMeta(orderNumber, meta, redis);
          } catch (retryErr) {
            sheetErrMessage = (retryErr as Error).message;
            logger.error("Retry Google Sheet update failed on duplicate press", {
              orderNumber,
              error: retryErr as Error,
            });

            await sendAdminTelegramAlert(
              adminChatId,
              `⚠️ <b>ADMIN ALERT: Sheet Re-Sync Failed</b>\n` +
              `• <b>Order:</b> <code>${escapeTelegramHtml(orderNumber)}</code>\n` +
              `• <b>Action:</b> ${action.toUpperCase()}\n` +
              `• <b>Error:</b> <code>${escapeTelegramHtml(sheetErrMessage)}</code>`
            );
          }

          if (sheetSuccess) {
            await answerTelegramCallback(
              callbackQueryId,
              `Order is ${action.toUpperCase()}. Sheet re-synced successfully.`
            );
            return NextResponse.json({
              ok: true,
              idempotent: true,
              status: currentStatus,
              sheetResynced: true,
            });
          } else {
            await answerTelegramCallback(
              callbackQueryId,
              `Order is ${action.toUpperCase()}, but Sheet sync failed. Admin notified.`
            );
            return NextResponse.json({
              ok: true,
              idempotent: true,
              status: currentStatus,
              sheetResynced: false,
            });
          }
        }

        await answerTelegramCallback(
          callbackQueryId,
          `Order is already marked as ${action.toUpperCase()}`
        );
        return NextResponse.json({ ok: true, idempotent: true, status: currentStatus });
      }

      // Validate transition
      if (!canTransitionStatus(currentStatus, action)) {
        logger.warn("Invalid status transition attempt", {
          orderNumber,
          from: currentStatus,
          to: action,
        });
        await answerTelegramCallback(
          callbackQueryId,
          `Cannot change to ${action.toUpperCase()} from ${currentStatus.toUpperCase()}`
        );
        return NextResponse.json({
          ok: true,
          error: `Invalid status transition from ${currentStatus} to ${action}`,
        });
      }

      // Update Google Sheet
      let sheetUpdated = false;
      let sheetError: Error | null = null;
      try {
        await updateSheetOrderStatusWithRetry(secrets.sheetId, meta?.rowRef || "", orderNumber, action);
        sheetUpdated = true;
      } catch (sheetErr) {
        sheetError = sheetErr as Error;
        logger.error("Failed to update Google Sheet status", {
          orderNumber,
          error: sheetError,
        });
      }

      // Update Redis status immediately with sheetSynced indicator
      await updateOrderMetaStatus(orderNumber, action, sheetUpdated, redis);

      // If Google Sheet update failed, alert admin immediately
      if (!sheetUpdated) {
        await sendAdminTelegramAlert(
          adminChatId,
          `⚠️ <b>ADMIN ALERT: Webhook Sheet Update Failed</b>\n` +
          `• <b>Order:</b> <code>${escapeTelegramHtml(orderNumber)}</code>\n` +
          `• <b>Transition:</b> ${currentStatus.toUpperCase()} ➔ ${action.toUpperCase()}\n` +
          `• <b>Error:</b> <code>${escapeTelegramHtml(sheetError?.message || "Unknown error")}</code>\n` +
          `• <b>Status in Redis:</b> ${action.toUpperCase()} (sheetSynced: false)`
        );
      }

      // Acknowledge callback query immediately to dismiss Telegram's button spinner
      await answerTelegramCallback(
        callbackQueryId,
        sheetUpdated
          ? `Status updated to ${STATUS_LABELS[action] || action.toUpperCase()}`
          : `Status updated to ${STATUS_LABELS[action] || action.toUpperCase()} (Sheet sync pending)`
      );

      // Edit Telegram Message
      if (messageId && callbackQuery.message?.text) {
        const originalText = callbackQuery.message.text;
        const updatedText = originalText.replace(
          /Status:\s*[A-Z_]+/i,
          `Status: <b>${action.toUpperCase()}</b>`
        );

        try {
          await editTelegramOrderMessage(
            chatId,
            messageId,
            updatedText,
            action,
            orderNumber
          );
        } catch (editErr) {
          logger.warn("Failed to edit Telegram order message", {
            orderNumber,
            error: editErr as Error,
          });
        }
      }

      logger.info("Order status transitioned successfully", {
        orderNumber,
        from: currentStatus,
        to: action,
        sheetUpdated,
      });

      return NextResponse.json({
        ok: true,
        orderNumber,
        previousStatus: currentStatus,
        newStatus: action,
        sheetUpdated,
      });
    } finally {
      await releaseOrderLock(orderNumber, lockToken, redis);
    }
  } catch (err: unknown) {
    const error = err as Error;
    logger.error("Unhandled error in Telegram webhook", { error });
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
