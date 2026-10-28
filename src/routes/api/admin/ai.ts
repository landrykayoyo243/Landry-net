import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";
import {
  getAiConfig,
  saveAiConfig,
  getAiUsageToday,
  listGeminiModels,
  testGeminiConnection,
  executeAiGeneration,
} from "@/lib/ai.server";

const configSchema = z.object({
  model: z.string().min(1).max(100),
  daily_request_limit: z.number().int().min(1).max(10000),
  max_prompt_chars: z.number().int().min(500).max(50000),
  allow_contact_messages: z.boolean(),
});

const generateSchema = z.object({
  prompt: z.string().min(1).max(50000),
  systemInstruction: z.string().max(10000).optional(),
  modelOverride: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  isContactMessage: z.boolean().optional(),
});

export const Route = createFileRoute("/api/admin/ai")({
  server: {
    handlers: {
      /** GET : Configuration, compteur du jour et liste des modèles */
      GET: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`ai_get_${ip}`, { windowMs: 60_000, max: 60 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes. Veuillez patienter." }, 429);
        }

        try {
          const [config, usage] = await Promise.all([
            getAiConfig(),
            getAiUsageToday(),
          ]);

          let models: unknown[] = [];
          try {
            models = await listGeminiModels();
          } catch {
            // Si la clé API n'est pas encore enregistrée ou invalide, aucun modèle fictif n'est inventé
            models = [];
          }

          return jsonResponse({
            config,
            usage,
            models,
          });
        } catch (err) {
          console.error("[api/admin/ai GET]", err);
          return jsonResponse({ error: "Impossible de charger la configuration IA." }, 500);
        }
      },

      /** POST : Actions IA (test, config, generate) */
      POST: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`ai_post_${ip}`, { windowMs: 60_000, max: 40 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes IA consécutives. Veuillez patienter." }, 429);
        }

        const url = new URL(request.url);
        const action = url.searchParams.get("action") ?? "generate";

        // Action 1 : Tester la connexion
        if (action === "test") {
          try {
            const res = await testGeminiConnection();
            return jsonResponse(res);
          } catch (err) {
            return jsonResponse(
              { ok: false, message: err instanceof Error ? err.message : "Erreur de test." },
              500,
            );
          }
        }

        // Action 2 : Modifier la configuration / plafonds
        if (action === "config") {
          const body = await request.json().catch(() => null);
          const parsed = configSchema.safeParse(body);
          if (!parsed.success) {
            return jsonResponse({ error: "Données de configuration invalides." }, 400);
          }

          try {
            const updated = await saveAiConfig(parsed.data, {
              userId: auth.user.id,
              userEmail: auth.user.email,
              headers: request.headers,
            });
            return jsonResponse({ success: true, config: updated });
          } catch (err) {
            return jsonResponse(
              { error: err instanceof Error ? err.message : "Erreur mise à jour configuration." },
              500,
            );
          }
        }

        // Action 3 : Exécuter une génération de texte via la passerelle unique
        const body = await request.json().catch(() => null);
        const parsed = generateSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: parsed.error.issues[0]?.message || "Demande invalide." }, 400);
        }

        try {
          const result = await executeAiGeneration({
            prompt: parsed.data.prompt,
            systemInstruction: parsed.data.systemInstruction,
            modelOverride: parsed.data.modelOverride,
            temperature: parsed.data.temperature,
            isContactMessage: parsed.data.isContactMessage,
            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          return jsonResponse({ success: true, ...result });
        } catch (err) {
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Erreur lors du traitement IA." },
            400,
          );
        }
      },
    },
  },
});
