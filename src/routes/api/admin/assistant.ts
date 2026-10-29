import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";
import { executeAiGeneration } from "@/lib/ai.server";
import { buildSystemInstruction } from "@/lib/skills.server";

const chatSchema = z.object({
  message: z.string().max(10000).optional(),
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
  directAction: z
    .object({
      type: z.enum(["create_project_draft", "create_experience", "create_certification"]),
      data: z.record(z.unknown()),
    })
    .optional(),
});

export const Route = createFileRoute("/api/admin/assistant")({
  server: {
    handlers: {
      /** POST : Envoyer un message à l'assistant ou exécuter une action */
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

        const { message, history, skillSlugs, temperature, directAction } = parsed.data;

        // 1. Exécution d'une action directe (bouton UI cliqué par l'administrateur)
        if (directAction) {
          try {
            const {
              executeCreateProjectDraft,
              executeCreateExperience,
              executeCreateCertification,
            } = await import("@/lib/assistant-actions.server");

            let actionResult;
            if (directAction.type === "create_project_draft") {
              actionResult = await executeCreateProjectDraft(directAction.data as never, {
                userId: auth.user.id,
                userEmail: auth.user.email,
                headers: request.headers,
              });
            } else if (directAction.type === "create_experience") {
              actionResult = await executeCreateExperience(directAction.data as never, {
                userId: auth.user.id,
                userEmail: auth.user.email,
                headers: request.headers,
              });
            } else if (directAction.type === "create_certification") {
              actionResult = await executeCreateCertification(directAction.data as never, {
                userId: auth.user.id,
                userEmail: auth.user.email,
                headers: request.headers,
              });
            }

            return jsonResponse({
              success: true,
              reply:
                directAction.type === "create_project_draft"
                  ? "Projet enregistré avec succès en mode brouillon."
                  : "Contenu enregistré avec succès.",
              actionExecuted: actionResult,
            });
          } catch (err) {
            console.error("[api/admin/assistant directAction]", err);
            return jsonResponse(
              { error: err instanceof Error ? err.message : "Erreur lors de l'enregistrement." },
              400,
            );
          }
        }

        if (!message || !message.trim()) {
          return jsonResponse({ error: "Le message ne peut pas être vide." }, 400);
        }

        try {
          // Construire le system instruction depuis les skills actifs
          const systemInstruction = await buildSystemInstruction(
            skillSlugs.length > 0 ? skillSlugs : undefined,
          );

          // Construire le prompt en intégrant l'historique de conversation et les directives éditoriales
          let fullPrompt = message.trim();
          const rappelContextuel = `CONSIGNES SPÉCIFIQUES POUR CETTE RÉPONSE :
- AJOUT CIBLÉ — RÈGLE ABSOLUE : Si Landry demande d'ajouter ou créer une section précise (témoignages, résultats, approche mobile…), génère UNIQUEMENT cette section sous [SECTION: Titre]. Ne réécris JAMAIS les sections existantes. Ne régénère JAMAIS l'intégralité du projet.
- DATE ACTUELLE DU PORTFOLIO : Nous sommes en 2026. Pour toute expérience, poste ou formation en cours, utilise impérativement "2026 — En cours" (ne jamais mettre 2024).
- LIEN D'ACCÈS / DÉMO : Si Landry a mentionné une URL (https://...), intègre-le sous "external_url" si une action create_project_draft est générée, et écris "Lien d'accès configuré : https://..." dans ton texte.
- CONSEIL ÉDITORIAL & STRUCTURE DES BLOCS : Privilégie la belle prose fluide (style Word soigné). Réserve les listes à puces aux équipements techniques précis ou métriques chiffrées uniquement.
- ACTIONS EXÉCUTABLES : Si Landry demande de créer un projet, un parcours ou une certification, place le bloc d'action (\`\`\`action:create_project_draft, create_experience ou create_certification) à la toute fin. Ce bloc est traité automatiquement et ne doit PAS apparaître dans le texte visible.
- ZÉRO ÉMOJI & ZÉRO GABARIT RÉPÉTITIF : sections sur-mesure balisées avec [SECTION: Titre Personnalisé].`;

          if (history.length > 0) {
            const historyText = history
              .map((h) => `${h.role === "user" ? "Landry" : "Assistant"}: ${h.text}`)
              .join("\n\n");
            fullPrompt = `HISTORIQUE RÉCENT DES ÉCHANGES:\n${historyText}\n\nNOUVELLE DEMANDE DE LANDRY:\n${message.trim()}\n\n${rappelContextuel}`;
          } else {
            fullPrompt = `${message.trim()}\n\n${rappelContextuel}`;
          }

          const result = await executeAiGeneration({
            prompt: fullPrompt,
            systemInstruction: systemInstruction || undefined,
            temperature: temperature ?? 0.65,

            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          // Analyser et exécuter les blocs d'action si présents dans la réponse
          const { processAiActionBlock } = await import("@/lib/assistant-actions.server");
          const { cleanedText, actionExecuted } = await processAiActionBlock(result.text, {
            userId: auth.user.id,
            userEmail: auth.user.email,
            headers: request.headers,
          });

          return jsonResponse({
            success: true,
            reply: cleanedText,
            actionExecuted,
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
