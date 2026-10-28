import { supabase } from "@/integrations/supabase/client";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Session administrateur absente ou expirée.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface AdminSecretMeta {
  name: string;
  label: string;
  last4: string;
  updated_at: string | null;
  is_configured: boolean;
  key_version: number;
}

export interface AdminAuditEntry {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  target: string;
  result: "success" | "failure";
  details: Record<string, unknown>;
  approx_country: string;
  approx_device: string;
  ip_masked: string;
}

export interface AuditLogResponse {
  logs: AdminAuditEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AiSkill {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  is_system: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AiSkillVersion {
  id: string;
  skill_id: string;
  version: number;
  title: string;
  content: string;
  created_at: string;
}


export const adminApi = {
  /** Récupérer la liste des secrets (métadonnées uniquement) */
  async listSecrets(): Promise<AdminSecretMeta[]> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/secrets", { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de charger les secrets.");
    return json.secrets as AdminSecretMeta[];
  },

  /** Ajouter ou remplacer un secret chiffré */
  async saveSecret(data: { name: string; label: string; value: string }): Promise<{ last4: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/secrets", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible d'enregistrer le secret.");
    return json as { last4: string };
  },

  /** Supprimer un secret */
  async deleteSecret(name: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/secrets", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de supprimer le secret.");
  },

  /** Tester le déchiffrement d'un secret */
  async testSecret(name: string): Promise<{ ok: boolean; message: string; last4?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/secrets", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Échec du test de déchiffrement.");
    return json;
  },

  /** Effectuer la rotation de la clé maître */
  async rotateMasterKey(oldKey: string, newKey: string): Promise<{ count: number; message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/secrets", {
      method: "PUT",
      headers,
      body: JSON.stringify({ oldKey, newKey }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Échec de la rotation de clé.");
    return json;
  },

  /** Récupérer les journaux d'audit avec filtres */
  async listAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AuditLogResponse> {
    const headers = await getAuthHeaders();
    const search = new URLSearchParams();
    if (params.page) search.set("page", String(params.page));
    if (params.limit) search.set("limit", String(params.limit));
    if (params.action && params.action !== "all") search.set("action", params.action);
    if (params.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params.dateTo) search.set("dateTo", params.dateTo);

    const res = await fetch(`/api/admin/audit?${search.toString()}`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de charger le journal d'audit.");
    return json as AuditLogResponse;
  },

  /** Récupérer la configuration de l'IA, l'utilisation du jour et les modèles disponibles */
  async getAiData(): Promise<{
    config: {
      model: string;
      daily_request_limit: number;
      max_prompt_chars: number;
      allow_contact_messages: boolean;
    };
    usage: {
      day: string;
      request_count: number;
      daily_limit: number;
      remaining: number;
    };
    models: Array<{
      id: string;
      name: string;
      displayName: string;
      description: string;
      recommended: boolean;
    }>;
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/ai", { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de charger les données IA.");
    return json;
  },

  /** Tester la connexion avec Google Gemini */
  async testAiConnection(): Promise<{
    ok: boolean;
    model: string;
    latencyMs: number;
    message: string;
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/ai?action=test", {
      method: "POST",
      headers,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Échec du test de connexion IA.");
    return json;
  },

  /** Mettre à jour la configuration et les plafonds de l'IA */
  async updateAiConfig(config: {
    model: string;
    daily_request_limit: number;
    max_prompt_chars: number;
    allow_contact_messages: boolean;
  }): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/ai?action=config", {
      method: "POST",
      headers,
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de mettre à jour la configuration IA.");
  },

  /** Génération de texte IA (passerelle unique) */
  async generateAiText(params: {
    prompt: string;
    systemInstruction?: string;
    modelOverride?: string;
    temperature?: number;
    isContactMessage?: boolean;
  }): Promise<{
    text: string;
    model: string;
    tokensUsed?: number;
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/ai?action=generate", {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Échec de la génération IA.");
    return json;
  },

  /** Tester l'envoi d'une notification Telegram */
  async testTelegram(): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/telegram", {
      method: "POST",
      headers,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Échec du test Telegram.");
    return json;
  },

  // ── PHASE C : Skills IA ──────────────────────────────────────────────────

  /** Lister tous les skills */
  async listSkills(): Promise<AiSkill[]> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/skills", { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de charger les skills.");
    return json.skills as AiSkill[];
  },

  /** Récupérer l'historique des versions d'un skill */
  async getSkillVersions(id: string): Promise<AiSkillVersion[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/skills?id=${id}`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de charger l'historique.");
    return json.versions as AiSkillVersion[];
  },

  /** Créer un nouveau skill */
  async createSkill(data: { slug: string; title: string; description: string; content: string }): Promise<AiSkill> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/skills", { method: "POST", headers, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de créer le skill.");
    return json.skill as AiSkill;
  },

  /** Mettre à jour un skill */
  async updateSkill(data: { id: string; title?: string; description?: string; content?: string; is_active?: boolean }): Promise<AiSkill> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/skills", { method: "PATCH", headers, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de modifier le skill.");
    return json.skill as AiSkill;
  },

  /** Supprimer un skill */
  async deleteSkill(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/skills", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Impossible de supprimer le skill.");
  },

  // ── PHASE D : Assistant IA ───────────────────────────────────────────────

  /** Envoyer un message à l'assistant IA */
  async chat(params: {
    message: string;
    history?: Array<{ role: "user" | "model"; text: string }>;
    skillSlugs?: string[];
    temperature?: number;
  }): Promise<{ reply: string; model: string; tokensUsed?: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/assistant", {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: params.message,
        history: params.history ?? [],
        skillSlugs: params.skillSlugs ?? [],
        temperature: params.temperature,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Échec de l'assistant IA.");
    return json;
  },
};

