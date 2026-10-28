import { getSecret } from "./secrets.server";

export interface TelegramSendResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Envoie une notification instantanée à Landry via Telegram.
 * Utilise les identifiants chiffrés (telegram_bot_token et telegram_chat_id) du coffre-fort.
 */
export async function sendTelegramNotification(htmlMessage: string): Promise<TelegramSendResult> {
  try {
    const token = await getSecret("telegram_bot_token");
    const chatId = await getSecret("telegram_chat_id");

    if (!token || !token.trim() || !chatId || !chatId.trim()) {
      return {
        ok: false,
        error: "Jeton du bot Telegram ou identifiant de conversation non configuré dans les secrets.",
      };
    }

    const endpoint = `https://api.telegram.org/bot${token.trim()}/sendMessage`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: htmlMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };

    if (!res.ok || !data.ok) {
      console.error("[Telegram API error]", data.description || res.status);
      return {
        ok: false,
        error: data.description || `Erreur Telegram HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      messageId: data.result?.message_id,
    };
  } catch (err) {
    console.error("[sendTelegramNotification exception]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur de connexion avec Telegram",
    };
  }
}

/**
 * Teste la configuration de la notification Telegram.
 */
export async function testTelegramNotification(): Promise<TelegramSendResult> {
  const timestamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const message = [
    "<b>[Notification Portfolio Landry Net]</b>",
    "",
    "Test de connexion Telegram réussi avec succès.",
    `Horodatage : ${timestamp}`,
    "Le système d'alertes instantanées est opérationnel.",
  ].join("\n");

  return sendTelegramNotification(message);
}
