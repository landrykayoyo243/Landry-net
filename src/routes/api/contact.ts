import { createFileRoute } from "@tanstack/react-router";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  subject: z.string().trim().min(1, "L'objet du message est requis").max(200),
  phone: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().min(5, "Message trop court (5 caractères minimum)").max(3000),
});

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          const parsed = contactSchema.safeParse(body);

          if (!parsed.success) {
            return json(
              { error: "Données invalides", details: parsed.error.flatten() },
              400,
            );
          }

          const { name, email, subject, phone, message } = parsed.data;

          // 1. Sauvegarde en base de données dans la table contact_messages
          try {
            const supabase = createClient(
              process.env["SUPABASE_URL"]!,
              process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
              { auth: { persistSession: false, autoRefreshToken: false } },
            );

            const formattedMessage = [
              `[Objet : ${subject}]`,
              phone ? `[Téléphone : ${phone}]` : null,
              "",
              message,
            ]
              .filter((line) => line !== null)
              .join("\n");

            await supabase.from("contact_messages").insert({
              name,
              email,
              message: formattedMessage,
              status: "unread",
            });

            // Notification instantanée via Telegram
            try {
              const { sendTelegramNotification } = await import("@/lib/telegram.server");
              const tgMsg = [
                "<b>[Nouveau message reçu sur le portfolio]</b>",
                "",
                `<b>Expéditeur :</b> ${escapeHtml(name)}`,
                `<b>Email :</b> ${escapeHtml(email)}`,
                phone ? `<b>Téléphone :</b> ${escapeHtml(phone)}` : null,
                `<b>Objet :</b> ${escapeHtml(subject)}`,
                "",
                "<b>Message :</b>",
                escapeHtml(message.slice(0, 1200)),
              ].filter(Boolean).join("\n");
              void sendTelegramNotification(tgMsg);
            } catch {
              // Ne bloque pas la soumission si Telegram n'est pas joignable
            }
          } catch (dbErr) {
            console.error("Erreur enregistrement message en base :", dbErr);
          }

          const host = process.env["SMTP_HOST"] || "smtp.gmail.com";
          const port = Number(process.env["SMTP_PORT"] || 465);
          const secure = process.env["SMTP_SECURE"] !== "false";
          const user = process.env["SMTP_USER"];
          const pass = process.env["SMTP_PASSWORD"];
          const from = process.env["SMTP_FROM"] || user;
          const to = process.env["CONTACT_EMAIL"] || user;

          if (!user || !pass) {
            console.error("Configuration SMTP manquante : SMTP_USER ou SMTP_PASSWORD non définis");
            return json({ error: "Configuration SMTP du serveur incomplète" }, 500);
          }

          const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
              user,
              pass,
            },
          });

          const mailSubject = `[Portfolio] ${subject} — ${name}`;
          const mailText = `Nouveau message reçu depuis le portfolio :

Nom : ${name}
Email : ${email}
${phone ? `Téléphone : ${phone}\n` : ""}Objet : ${subject}

Message :
${message}
`;

          const mailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px;">
                Nouveau message depuis le portfolio
              </h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;"><strong>Expéditeur :</strong></td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600;">${escapeHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;"><strong>Email :</strong></td>
                  <td style="padding: 8px 0; color: #2563eb; font-size: 15px;">
                    <a href="mailto:${escapeHtml(email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(email)}</a>
                  </td>
                </tr>
                ${phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;"><strong>Téléphone :</strong></td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 15px;">
                    <a href="tel:${escapeHtml(phone)}" style="color: #0f172a; text-decoration: none;">${escapeHtml(phone)}</a>
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;"><strong>Objet :</strong></td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600;">${escapeHtml(subject)}</td>
                </tr>
              </table>
              <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Message :</p>
                <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
              </div>
              <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">
                Ce message a été envoyé via le formulaire de contact de votre portfolio. Vous pouvez répondre directement à cet email.
              </p>
            </div>
          `;

          await transporter.sendMail({
            from: `"${name} (Portfolio)" <${from}>`,
            to,
            replyTo: email,
            subject: mailSubject,
            text: mailText,
            html: mailHtml,
          });

          return json({ success: true, message: "Votre message a bien été envoyé !" });
        } catch (error) {
          console.error("Erreur lors de l'envoi de l'email :", error);
          const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
          return json(
            { error: "Échec de l'envoi du message. Veuillez réessayer ultérieurement.", details: errorMessage },
            500,
          );
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
