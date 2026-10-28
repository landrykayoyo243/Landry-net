import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditAction =
  | "secret.create"
  | "secret.update"
  | "secret.delete"
  | "secret.test"
  | "secret.rotate"
  | "ai.generate"
  | "ai.quota_exceeded"
  | "ai.error"
  | "skill.create"
  | "skill.update"
  | "skill.delete"
  | "skill.test"
  | "assistant.proposal.apply"
  | "assistant.proposal.ignore";

export interface LogAuditParams {
  action: AuditAction | string;
  target: string;
  result: "success" | "failure";
  userId?: string | null;
  userEmail?: string | null;
  details?: Record<string, unknown>;
  requestHeaders?: Headers | null;
}

/** Masque une adresse IP pour respecter la vie privée (tronquée). */
export function maskIp(rawIp?: string | null): string {
  if (!rawIp || rawIp === "unknown" || rawIp === "127.0.0.1" || rawIp === "::1") {
    return "127.0.0.xxx";
  }
  const clean = rawIp.trim();
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  if (clean.includes(":")) {
    const parts = clean.split(":");
    return `${parts.slice(0, 3).join(":")}::xxxx`;
  }
  return "anonyme";
}

/** Simplifie le User-Agent en appareil / navigateur lisible. */
export function extractDevice(ua?: string | null): string {
  if (!ua) return "Inconnu";
  let os = "Système inconnu";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Navigateur";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  return `${browser} (${os})`;
}

/**
 * Nettoie récursivement un objet pour garantir qu'AUCUN secret, mot de passe
 * ou token n'atterrisse dans les logs.
 */
export function sanitizeLogDetails(details?: Record<string, unknown>): Record<string, unknown> {
  if (!details) return {};
  const forbiddenPatterns = /password|secret|key|token|auth|credential|api_key|bearer/i;
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(details)) {
    if (forbiddenPatterns.test(key)) {
      sanitized[key] = "[MASQUÉ]";
      continue;
    }
    if (typeof val === "string") {
      // Si la chaîne ressemble à un jeton JWT ou clé longue, on la masque
      if (val.length > 80 && (val.startsWith("eyJ") || /^[a-zA-Z0-9_-]{40,}$/.test(val))) {
        sanitized[key] = "[CHAÎNE MASQUÉE]";
      } else {
        sanitized[key] = val.slice(0, 500);
      }
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = sanitizeLogDetails(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Enregistre une entrée dans le journal d'audit serveur.
 * Réservé au serveur (service_role), jamais modifiable depuis le navigateur.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const headers = params.requestHeaders;
    const rawIp =
      headers?.get("cf-connecting-ip") ??
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers?.get("x-real-ip") ??
      "unknown";

    const country =
      headers?.get("cf-ipcountry") ??
      headers?.get("x-vercel-ip-country") ??
      headers?.get("geo-country") ??
      "Inconnu";

    const ua = headers?.get("user-agent") ?? "Inconnu";

    await supabaseAdmin.from("audit_log").insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      action: params.action,
      target: params.target,
      result: params.result,
      details: sanitizeLogDetails(params.details),
      approx_country: country,
      approx_device: extractDevice(ua),
      ip_masked: maskIp(rawIp),
    });
  } catch (err) {
    // Le journal d'audit ne doit jamais bloquer le serveur en cas de panne
    console.error("[audit_log error]", err instanceof Error ? err.message : "Erreur journal");
  }
}

/**
 * Purge les journaux de plus de X jours (par défaut 90 jours minimum de conservation).
 */
export async function pruneAuditLogs(days = 90): Promise<number> {
  const retentionDays = Math.max(days, 90);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin.from("audit_log").delete().lt("created_at", cutoff).select("id");
  if (error) {
    console.error("[pruneAuditLogs error]", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
