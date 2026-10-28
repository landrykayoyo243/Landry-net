import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";
import { executeAiGeneration } from "@/lib/ai.server";
import { buildSystemInstruction } from "@/lib/skills.server";

const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model", "assistant"]),
        text: z.string().max(10000),
      }),
    )
    .max(40)
    .default([]),
  skillSlugs: z.array(z.string().max(80)).max(20).default([]),
  temperature: z.number().min(0).max(2).optional(),
});

export const Route = createFileRoute("/api/admin/assistant")({
  server: {
    handlers: {
      /** POST : Envoyer un message à l'assistant */
      POST: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`assistant_${ip}`, { windowMs: 60_000, max: 30 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes. Veuillez patienter une minute." }, 429);
        }

        const body = await request.json().catch(() => null);
        const parsed = chatSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: parsed.error.issues[0]?.message || "Demande invalide." },
            400,
          );
        }

        const { message, history, skillSlugs, temperature } = parsed.data;

        try {
          // Construire le system instruction depuis les skills actifs
          const systemInstruction = await buildSystemInstruction(
            skillSlugs.length > 0 ? skillSlugs : undefined,
          );

          // Construire le prompt en intégrant l'historique de conversation
          let fullPrompt = message.trim();
          if (history.length > 0) {
            const historyText = history
              .map((h) => `${h.role === "user" ? "Utilisateur" : "Assistant"}: ${h.text}`)
              .join("\n");
            fullPrompt = `Historique de la conversation:\n${historyText}\n\nNouveau message de l'utilisateur: ${message.trim()}`;
          }

          const result = await executeAiGeneration({
            prompt: fullPrompt,
            systemInstruction: systemInstruction || undefined,
            temperature: temperature ?? 0.7,
            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          return jsonResponse({
            success: true,
            reply: result.text,
            model: result.model,
            tokensUsed: result.tokensUsed,
          });
        } catch (err) {
          console.error("[api/admin/assistant POST]", err);
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Erreur de l'assistant IA." },
            400,
          );
        }
      },
    },
  },
});
