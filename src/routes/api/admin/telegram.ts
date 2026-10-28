import { createFileRoute } from "@tanstack/react-router";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { testTelegramNotification } from "@/lib/telegram.server";

export const Route = createFileRoute("/api/admin/telegram")({
  server: {
    handlers: {
      /** POST : Tester l'envoi d'une notification Telegram */
      POST: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const res = await testTelegramNotification();
        if (!res.ok) {
          return jsonResponse({ error: res.error || "Échec de l'envoi Telegram" }, 400);
        }

        return jsonResponse({ success: true, message: "Notification Telegram envoyée avec succès !" });
      },
    },
  },
});
