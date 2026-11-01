export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/lib/server/env");
    const { validateAdminTelegramChatId } = await import("@/lib/server/clients");
    getServerEnv();
    validateAdminTelegramChatId();
  }
}
