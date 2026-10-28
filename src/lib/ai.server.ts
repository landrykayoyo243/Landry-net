import { getSecret } from "./secrets.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

export interface AiConfig {
  model: string;
  daily_request_limit: number;
  max_prompt_chars: number;
  allow_contact_messages: boolean;
}

export interface AiModelInfo {
  id: string; // ex: "gemini-2.5-flash"
  name: string; // ex: "models/gemini-2.5-flash"
  displayName: string;
  description: string;
  recommended: boolean;
}

export interface AiUsageToday {
  day: string;
  request_count: number;
  daily_limit: number;
  remaining: number;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  model: "gemini-3.5-flash",
  daily_request_limit: 100,
  max_prompt_chars: 8000,
  allow_contact_messages: false, // Offre gratuite par défaut : ne pas envoyer les messages privés
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Récupère la clé API Gemini chiffrée depuis le coffre serveur */
export async function getGeminiApiKey(): Promise<string> {
  const key = await getSecret("ai_api_key");
  if (!key || !key.trim()) {
    throw new Error(
      "Aucune clé API Gemini n'est configurée. Veuillez renseigner votre clé dans Paramètres & Secrets.",
    );
  }
  return key.trim();
}

/** Récupère la configuration actuelle de l'IA depuis app_settings */
export async function getAiConfig(): Promise<AiConfig> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "ai_config")
    .maybeSingle();

  if (!data?.value || typeof data.value !== "object") {
    return DEFAULT_AI_CONFIG;
  }

  const v = data.value as Partial<AiConfig>;
  let chosenModel = typeof v.model === "string" && v.model.trim() ? v.model.trim() : DEFAULT_AI_CONFIG.model;
  // Migration automatique si le modèle précédemment sauvegardé n'est plus supporté par Google
  if (chosenModel === "gemini-2.5-flash" || chosenModel === "gemini-1.5-flash") {
    chosenModel = "gemini-3.5-flash";
  }

  return {
    model: chosenModel,
    daily_request_limit: typeof v.daily_request_limit === "number" ? Math.max(1, v.daily_request_limit) : DEFAULT_AI_CONFIG.daily_request_limit,
    max_prompt_chars: typeof v.max_prompt_chars === "number" ? Math.max(500, v.max_prompt_chars) : DEFAULT_AI_CONFIG.max_prompt_chars,
    allow_contact_messages: Boolean(v.allow_contact_messages),
  };
}

/** Met à jour la configuration de l'IA */
export async function saveAiConfig(
  newConfig: Partial<AiConfig>,
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<AiConfig> {
  const current = await getAiConfig();
  const updated: AiConfig = {
    ...current,
    ...newConfig,
  };

  const { error } = await supabaseAdmin.from("app_settings").upsert(
    {
      key: "ai_config",
      value: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error("Impossible d'enregistrer la configuration de l'IA.");
  }

  await logAudit({
    action: "ai.config_update",
    target: "ai_config",
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: {
      model: updated.model,
      daily_request_limit: updated.daily_request_limit,
      allow_contact_messages: updated.allow_contact_messages,
    },
    requestHeaders: context?.headers,
  });

  return updated;
}

/** Récupère l'utilisation du jour et le quota restant */
export async function getAiUsageToday(): Promise<AiUsageToday> {
  const today = new Date().toISOString().slice(0, 10);
  const config = await getAiConfig();

  const { data } = await supabaseAdmin
    .from("ai_usage_daily")
    .select("request_count")
    .eq("day", today)
    .maybeSingle();

  const count = data?.request_count ?? 0;
  return {
    day: today,
    request_count: count,
    daily_limit: config.daily_request_limit,
    remaining: Math.max(0, config.daily_request_limit - count),
  };
}

/** Incrémente le compteur d'utilisation journalier */
async function incrementDailyUsage(tokensUsed = 0): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Upsert atomique ou sélection + update
  const { data: existing } = await supabaseAdmin
    .from("ai_usage_daily")
    .select("request_count, token_count")
    .eq("day", today)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("ai_usage_daily")
      .update({
        request_count: (existing.request_count ?? 0) + 1,
        token_count: (existing.token_count ?? 0) + tokensUsed,
        updated_at: new Date().toISOString(),
      })
      .eq("day", today);
  } else {
    await supabaseAdmin.from("ai_usage_daily").insert({
      day: today,
      request_count: 1,
      token_count: tokensUsed,
    });
  }
}

/**
 * Liste dynamique des modèles Gemini disponibles depuis Google.
 * Met en avant (recommandé) les modèles rapides de type Flash.
 */
export async function listGeminiModels(): Promise<AiModelInfo[]> {
  const apiKey = await getGeminiApiKey();

  const response = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`, {
    headers: {
      "x-goog-api-key": apiKey,
    },
  }).catch(() => {
    throw new Error("Impossible de contacter l'API Google Gemini (erreur réseau).");
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 403 || response.status === 401) {
      throw new Error("La clé API Gemini configurée est invalide ou n'a pas les droits requis.");
    }
    throw new Error("Échec de la récupération des modèles Gemini.");
  }

  const json = (await response.json()) as {
    models?: Array<{
      name: string;
      displayName?: string;
      description?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  const rawModels = json.models ?? [];

  // Filtrer uniquement les modèles textuels actifs supportant generateContent
  const usable = rawModels.filter((m) =>
    Array.isArray(m.supportedGenerationMethods) &&
    m.supportedGenerationMethods.includes("generateContent") &&
    !/tts|audio|clip|robotics|computer-use|transcribe|argon|lyria/i.test(m.name),
  );

  const models: AiModelInfo[] = usable.map((m) => {
    const id = m.name.replace(/^models\//, "");
    const isFlash = /flash/i.test(id);
    const isRecommended = id === "gemini-3.5-flash" || id === "gemini-flash-latest" || (isFlash && !/preview|image/i.test(id));

    return {
      id,
      name: m.name,
      displayName: m.displayName || id,
      description: m.description || "",
      recommended: Boolean(isRecommended),
    };
  });

  // Trier pour mettre les modèles recommandés Flash en premier
  return models.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return a.id.localeCompare(b.id);
  });
}

export interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  isContactMessage?: boolean;
  modelOverride?: string;
  temperature?: number;
  userId?: string;
  userEmail?: string;
  requestHeaders?: Headers;
}

export interface GenerateTextResult {
  text: string;
  model: string;
  tokensUsed?: number;
}

/**
 * PORTE D'ENTRÉE UNIQUE POUR TOUS LES APPELS IA DU SITE.
 *
 * Tout le site (Assistant, Skills, Éditeur, etc.) passe obligatoirement par cette fonction.
 * Elle garantit :
 * 1. La non-exposition de la clé API
 * 2. Le respect des plafonds journaliers
 * 3. La validation de la taille de prompt
 * 4. La protection des messages privés en offre gratuite
 * 5. L'audit et le journal de chaque requête
 * 6. La gestion transparente et propre des erreurs de quota 429
 */
export async function executeAiGeneration(options: GenerateTextOptions): Promise<GenerateTextResult> {
  const config = await getAiConfig();

  // 1. Règle Offre Gratuite : protection des messages de contact
  if (options.isContactMessage && !config.allow_contact_messages) {
    throw new Error(
      "L'envoi de messages de contact à l'IA est désactivé par défaut pour protéger la vie privée en offre gratuite. Activez cette option dans Paramètres si vous disposez d'une offre payante.",
    );
  }

  // 2. Validation de la taille du prompt
  const cleanPrompt = (options.prompt ?? "").trim();
  if (!cleanPrompt) {
    throw new Error("La demande ne peut pas être vide.");
  }
  if (cleanPrompt.length > config.max_prompt_chars) {
    throw new Error(
      `La demande dépasse la taille maximale autorisée (${cleanPrompt.length} / ${config.max_prompt_chars} caractères).`,
    );
  }

  // 3. Vérification du quota journalier
  const usage = await getAiUsageToday();
  if (usage.request_count >= config.daily_request_limit) {
    await logAudit({
      action: "ai.quota_exceeded",
      target: "gemini",
      result: "failure",
      userId: options.userId,
      userEmail: options.userEmail,
      details: { count: usage.request_count, limit: config.daily_request_limit },
      requestHeaders: options.requestHeaders,
    });
    throw new Error(
      `Plafond quotidien de requêtes IA atteint (${config.daily_request_limit} requêtes/jour). Réessayez demain ou augmentez le plafond dans Paramètres.`,
    );
  }

  const apiKey = await getGeminiApiKey();
  let selectedModel = (options.modelOverride?.trim() || config.model || DEFAULT_AI_CONFIG.model).replace(/^models\//, "");
  if (selectedModel === "gemini-2.5-flash" || selectedModel === "gemini-1.5-flash") {
    selectedModel = "gemini-3.5-flash";
  }

  // 5. Construction du payload Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    {
      role: "user",
      parts: [{ text: cleanPrompt }],
    },
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (options.systemInstruction?.trim()) {
    body["systemInstruction"] = {
      parts: [{ text: options.systemInstruction.trim() }],
    };
  }

  // Modèles de repli automatique en cas de surcharge temporaire (503 / 429) de Google
  const candidateModels = Array.from(
    new Set([
      selectedModel,
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-2.5-flash-lite",
    ]),
  );

  let response: Response | null = null;
  let lastResponse: Response | null = null;
  let successfulModel = selectedModel;
  let lastErrorMessage = "";

  for (const modelToTry of candidateModels) {
    const endpoint = `${GEMINI_API_BASE}/models/${modelToTry}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      lastResponse = res;

      if (res.ok) {
        response = res;
        successfulModel = modelToTry;
        break;
      }

      // Si erreur 503 (surcharge Google) ou 429 (rate-limit), tenter le modèle suivant
      if (res.status === 503 || res.status === 429) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        lastErrorMessage = errJson.error?.message || `Serveur Google temporairement saturé (${res.status})`;
        console.warn(`[Gemini ${modelToTry}] Surcharge (${res.status}), basculement automatique vers le modèle suivant...`);
        continue;
      }

      // Autre erreur HTTP (ex: 400, 401, 403)
      response = res;
      successfulModel = modelToTry;
      break;
    } catch {
      lastErrorMessage = "Erreur réseau lors de la connexion aux serveurs Google.";
      continue;
    }
  }

  if (!response || !response.ok) {
    const finalRes = response || lastResponse;
    const status = finalRes ? finalRes.status : 0;

    await logAudit({
      action: status === 429 ? "ai.quota_exceeded" : "ai.error",
      target: selectedModel,
      result: "failure",
      userId: options.userId,
      userEmail: options.userEmail,
      details: { status, reason: lastErrorMessage },
      requestHeaders: options.requestHeaders,
    });

    if (!finalRes) {
      throw new Error("Impossible de joindre le serveur Google Gemini. Vérifiez votre connexion Internet.");
    }
    if (status === 429) {
      throw new Error(
        "La limite de requêtes Google Gemini a été temporairement atteinte. Veuillez patienter une minute avant de réessayer.",
      );
    }
    if (status === 503) {
      throw new Error(
        "Les serveurs Google Gemini sont temporairement surchargés en raison d'une forte affluence. Veuillez patienter quelques instants avant de réessayer.",
      );
    }
    if (status === 400 || status === 401 || status === 403) {
      throw new Error("Clé API Gemini invalide ou droits insuffisants pour accéder au modèle.");
    }
    throw new Error(lastErrorMessage || "Une erreur est survenue lors de la communication avec Google Gemini.");
  }

  selectedModel = successfulModel;

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: {
      totalTokenCount?: number;
    };
  };

  const candidate = data.candidates?.[0];
  const outputText = candidate?.content?.parts?.[0]?.text ?? "";

  if (!outputText) {
    throw new Error("L'assistant n'a renvoyé aucun texte. Réessayez avec une autre formulation.");
  }

  const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;

  // 7. Incrémentation du compteur et audit
  await incrementDailyUsage(tokensUsed);

  await logAudit({
    action: "ai.generate",
    target: selectedModel,
    result: "success",
    userId: options.userId,
    userEmail: options.userEmail,
    details: {
      prompt_length: cleanPrompt.length,
      response_length: outputText.length,
      tokens: tokensUsed,
    },
    requestHeaders: options.requestHeaders,
  });

  return {
    text: outputText,
    model: selectedModel,
    tokensUsed,
  };
}

/** Teste la connexion directe avec Gemini */
export async function testGeminiConnection(): Promise<{
  ok: boolean;
  model: string;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  const apiKey = await getGeminiApiKey();
  const config = await getAiConfig();

  const cleanModel = (config.model || "gemini-3.5-flash").replace(/^models\//, "");
  const endpoint = `${GEMINI_API_BASE}/models/${cleanModel}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reponds par le mot 'OK' uniquement." }] }],
        generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
      }),
    });

    const latency = Date.now() - start;

    if (!res.ok) {
      if (res.status === 503) {
        // Tenter modèle de repli
        const fallbackEndpoint = `${GEMINI_API_BASE}/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const fallbackRes = await fetch(fallbackEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "OK" }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
          }),
        }).catch(() => null);

        if (fallbackRes && fallbackRes.ok) {
          return {
            ok: true,
            model: "gemini-3.5-flash-lite",
            latencyMs: Date.now() - start,
            message: `Connexion établie avec succès via gemini-3.5-flash-lite (${Date.now() - start} ms, repli car ${cleanModel} était saturé).`,
          };
        }

        return {
          ok: false,
          model: cleanModel,
          latencyMs: latency,
          message: "Google Gemini est temporairement surchargé (503). Vos clés sont valides, réessayez dans un instant.",
        };
      }
      if (res.status === 404) {
        return {
          ok: false,
          model: cleanModel,
          latencyMs: latency,
          message: `Le modèle « ${cleanModel} » n'est plus supporté (404). Sélectionnez un modèle Flash récent ci-dessous.`,
        };
      }
      return {
        ok: false,
        model: cleanModel,
        latencyMs: latency,
        message: `Erreur API Gemini (${res.status}). Vérifiez votre clé API.`,
      };
    }

    return {
      ok: true,
      model: cleanModel,
      latencyMs: latency,
      message: `Connexion établie avec succès avec le modèle ${config.model} (${latency} ms).`,
    };
  } catch {
    return {
      ok: false,
      model: config.model,
      latencyMs: Date.now() - start,
      message: "Impossible de contacter les serveurs de Google (erreur réseau).",
    };
  }
}
