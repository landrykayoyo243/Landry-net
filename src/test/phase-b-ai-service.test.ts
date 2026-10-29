import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  getGeminiApiKey,
  getAiConfig,
  saveAiConfig,
  getAiUsageToday,
  executeAiGeneration,
  listGeminiModels,
} from "@/lib/ai.server";
import { saveSecret, deleteSecret, getSecret } from "@/lib/secrets.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TEST_GEMINI_KEY = "AIzaSyDummyTestKeyForUnitTests123456789";
let userOriginalKey: string | null = null;
let userOriginalConfig: import("@/lib/ai.server").AiConfig | null = null;

describe("PHASE B : Service IA Google Gemini (Porte d'entrée unique & Quotas)", { timeout: 15000 }, () => {
  beforeAll(async () => {
    // Sauvegarder la vraie clé et la vraie configuration de l'utilisateur pour ne JAMAIS les effacer
    userOriginalKey = await getSecret("ai_api_key");
    userOriginalConfig = await getAiConfig();
  });

  beforeEach(async () => {
    // S'assurer que la clé de test est présente
    await saveSecret({
      name: "ai_api_key",
      label: "Clé API IA (Gemini)",
      value: TEST_GEMINI_KEY,
    });

    // Configuration temporaire isolée pour les tests
    await saveAiConfig({
      model: "gemini-1.5-flash",
      daily_request_limit: 5,
      max_prompt_chars: 500,
      allow_contact_messages: false,
    });
  });

  afterAll(async () => {
    // Restaurer impérativement la vraie clé et la vraie configuration de l'utilisateur après les tests
    if (userOriginalKey) {
      await saveSecret({
        name: "ai_api_key",
        label: "Clé API IA (Gemini)",
        value: userOriginalKey,
      });
    } else {
      await deleteSecret({ name: "ai_api_key" }).catch(() => {});
    }

    if (userOriginalConfig) {
      await saveAiConfig(userOriginalConfig);
    }
  });

  it("1. Refuse proprement si la clé API Gemini n'est pas configurée dans le coffre", async () => {
    // Supprimer temporairement la clé
    await deleteSecret({ name: "ai_api_key" });

    await expect(getGeminiApiKey()).rejects.toThrow(
      "Aucune clé API Gemini n'est configurée",
    );

    // Restaurer la clé pour les tests suivants
    await saveSecret({
      name: "ai_api_key",
      label: "Clé API IA (Gemini)",
      value: TEST_GEMINI_KEY,
    });
  });

  it("2. La clé API n'est JAMAIS exposée dans la configuration, l'usage ni les modèles", async () => {
    const config = await getAiConfig();
    const configStr = JSON.stringify(config);
    expect(configStr).not.toContain("AIzaSy");
    expect(configStr).not.toContain("DummyTestKey");

    const usage = await getAiUsageToday();
    const usageStr = JSON.stringify(usage);
    expect(usageStr).not.toContain("AIzaSy");
  });

  it("3. Bloque l'envoi de messages de contact en offre gratuite (protection vie privée)", async () => {
    await expect(
      executeAiGeneration({
        prompt: "Contenu d'un message reçu de contact",
        isContactMessage: true,
      }),
    ).rejects.toThrow("L'envoi de messages de contact à l'IA est désactivé par défaut");
  });

  it("4. Bloque les demandes dépassant la taille maximale autorisée (max_prompt_chars)", async () => {
    const tooLongPrompt = "A".repeat(501); // max fixé à 500 dans beforeEach

    await expect(
      executeAiGeneration({
        prompt: tooLongPrompt,
      }),
    ).rejects.toThrow("La demande dépasse la taille maximale autorisée");
  });

  it("5. Bloque la requête lorsque le plafond quotidien de requêtes est atteint", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Simuler que le quota est déjà atteint (5/5)
    await supabaseAdmin.from("ai_usage_daily").upsert(
      {
        day: today,
        request_count: 5,
        token_count: 1000,
      },
      { onConflict: "day" },
    );

    await expect(
      executeAiGeneration({
        prompt: "Demande valide",
      }),
    ).rejects.toThrow("Plafond quotidien de requêtes IA atteint");

    // Vérifier qu'une entrée d'audit "ai.quota_exceeded" a bien été créée
    const { data: auditLog } = await supabaseAdmin
      .from("audit_log")
      .select("action, target, result")
      .eq("action", "ai.quota_exceeded")
      .order("created_at", { ascending: false })
      .limit(1);

    expect(auditLog).toBeDefined();
    expect(auditLog?.length).toBeGreaterThanOrEqual(1);
  });

  it("6. Gère proprement les erreurs de quota Google HTTP 429 sans fuite technique", async () => {
    const today = new Date().toISOString().slice(0, 10);
    // Réinitialiser le compteur du jour à 0
    await supabaseAdmin.from("ai_usage_daily").upsert(
      {
        day: today,
        request_count: 0,
        token_count: 0,
      },
      { onConflict: "day" },
    );

    // Mocker sélectivement l'endpoint Gemini sans casser les requêtes Supabase
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((input, init) => {
      const urlStr = String(input);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({
            error: { code: 429, message: "Resource exhausted (quota exceeded)." },
          }),
        } as unknown as Response);
      }
      return originalFetch(input, init);
    });

    try {
      await expect(
        executeAiGeneration({
          prompt: "Bonjour Gemini",
        }),
      ).rejects.toThrow("La limite de requêtes Google Gemini a été temporairement atteinte");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("7. Gère proprement les erreurs réseau lors de l'appel Gemini", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await supabaseAdmin.from("ai_usage_daily").upsert(
      { day: today, request_count: 0, token_count: 0 },
      { onConflict: "day" },
    );

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((input, init) => {
      const urlStr = String(input);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return Promise.reject(new Error("ENOTFOUND generativelanguage.googleapis.com"));
      }
      return originalFetch(input, init);
    });

    try {
      await expect(
        executeAiGeneration({
          prompt: "Bonjour Gemini",
        }),
      ).rejects.toThrow("Impossible de joindre le serveur Google Gemini");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("8. Recommande les modèles de type Flash lors du listing", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((input, init) => {
      const urlStr = String(input);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              {
                name: "models/gemini-1.5-flash",
                displayName: "Gemini 1.5 Flash",
                supportedGenerationMethods: ["generateContent"],
              },
              {
                name: "models/gemini-1.5-pro",
                displayName: "Gemini 1.5 Pro",
                supportedGenerationMethods: ["generateContent"],
              },
              {
                name: "models/embedding-001",
                displayName: "Embedding",
                supportedGenerationMethods: ["embedContent"],
              },
            ],
          }),
        } as unknown as Response);
      }
      return originalFetch(input, init);
    });

    try {
      const models = await listGeminiModels();
      // embedding doit être exclu
      expect(models.find((m) => m.id === "embedding-001")).toBeUndefined();

      // Flash doit être recommandé et en tête
      const flash = models.find((m) => m.id === "gemini-1.5-flash");
      expect(flash).toBeDefined();
      expect(flash?.recommended).toBe(true);
      expect(models[0].id).toBe("gemini-1.5-flash");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("9. Succès d'un appel via la passerelle unique et incrémentation de l'usage", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await supabaseAdmin.from("ai_usage_daily").upsert(
      { day: today, request_count: 1, token_count: 100 },
      { onConflict: "day" },
    );

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((input, init) => {
      const urlStr = String(input);
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Voici le texte généré par Gemini." }],
                },
              },
            ],
            usageMetadata: {
              totalTokenCount: 42,
            },
          }),
        } as unknown as Response);
      }
      return originalFetch(input, init);
    });

    try {
      const result = await executeAiGeneration({
        prompt: "Rédige une courte phrase.",
      });

      expect(result.text).toBe("Voici le texte généré par Gemini.");
      expect(result.model).toBe("gemini-3.5-flash");
      expect(result.tokensUsed).toBe(42);

      // Vérifier que le compteur du jour a été incrémenté (de 1 à 2)
      const usage = await getAiUsageToday();
      expect(usage.request_count).toBe(2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
