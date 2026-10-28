import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommandé pour GCM

export const RESERVED_SECRET_SLOTS = [
  { name: "ai_api_key", label: "Clé API IA (Gemini)", placeholder: "AIzaSy..." },
  { name: "telegram_bot_token", label: "Jeton du bot Telegram", placeholder: "123456789:ABCdefGHIjkl..." },
  { name: "telegram_chat_id", label: "Identifiant de conversation Telegram", placeholder: "-1001234567890" },
] as const;

export interface SecretMetadata {
  name: string;
  label: string;
  last4: string;
  updated_at: string | null;
  is_configured: boolean;
  key_version: number;
}

/**
 * Normalise et valide la clé maître de chiffrement (32 octets = 256 bits).
 * Accepte 64 caractères hexadécimaux ou 32 octets bruts / base64.
 */
export function parseMasterKey(keyInput?: string | null): Buffer {
  let key = keyInput ?? process.env["APP_ENCRYPTION_KEY"];

  if (!key && process.env["NODE_ENV"] !== "test") {
    try {
      const envPath = path.resolve(".env");
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, "utf-8");
        for (const line of raw.split("\n")) {
          const match = line.match(/^([^#=]+)=(.*)$/);
          if (match && match[1].trim() === "APP_ENCRYPTION_KEY") {
            key = match[2].trim().replace(/^["']|["']$/g, "");
            process.env["APP_ENCRYPTION_KEY"] = key;
            break;
          }
        }
      }
    } catch {
      // Pas d'accès au système de fichier ou environnement distant
    }
  }

  if (!key || typeof key !== "string" || !key.trim()) {
    throw new Error(
      "La clé maître de chiffrement (APP_ENCRYPTION_KEY) n'est pas configurée sur le serveur. Opération refusée pour des raisons de sécurité.",
    );
  }

  const trimmed = key.trim();

  // Si format hexadécimal (64 caractères hex)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  // Si format base64 (44 caractères avec padding ou 32 octets)
  if (trimmed.length === 44 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32) return buf;
  }

  // Si format chaîne directe de 32 octets
  const utf8Buf = Buffer.from(trimmed, "utf-8");
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }

  throw new Error(
    "La clé APP_ENCRYPTION_KEY est invalide. Elle doit comporter exactement 32 octets (ex: 64 caractères hexadécimaux générés avec crypto.randomBytes(32).toString('hex')).",
  );
}

/** Chiffre une chaîne avec AES-256-GCM et un nonce/iv unique. */
export function encryptValue(
  plainText: string,
  keyVersion = 1,
  customMasterKey?: string,
): { value_encrypted: string; iv: string; tag: string; last4: string; key_version: number } {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("La valeur à chiffrer ne peut pas être vide.");
  }

  const masterKey = parseMasterKey(customMasterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(plainText, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  const cleanText = plainText.trim();
  const last4 = cleanText.length > 4 ? cleanText.slice(-4) : cleanText;

  return {
    value_encrypted: encrypted,
    iv: iv.toString("hex"),
    tag,
    last4,
    key_version: keyVersion,
  };
}

/** Déchiffre un enregistrement AES-256-GCM et vérifie son intégrité d'authentification. */
export function decryptValue(
  record: { value_encrypted: string; iv: string; tag: string },
  customMasterKey?: string,
): string {
  const masterKey = parseMasterKey(customMasterKey);
  const iv = Buffer.from(record.iv, "hex");
  const tag = Buffer.from(record.tag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(record.value_encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

/**
 * Fonction interne getSecret(name)
 * RÉSERVÉE aux fonctions serveur (API, route handlers, server functions).
 * Ne jamais renvoyer le résultat au navigateur client.
 */
export async function getSecret(name: string): Promise<string | null> {
  if (!name || typeof name !== "string") return null;

  const { data, error } = await supabaseAdmin
    .from("app_secrets")
    .select("name, value_encrypted, iv, tag, key_version")
    .eq("name", name.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return null;

  try {
    return decryptValue({
      value_encrypted: data.value_encrypted,
      iv: data.iv,
      tag: data.tag,
    });
  } catch (decErr) {
    console.error(`[getSecret] Échec déchiffrement pour ${name}:`, decErr instanceof Error ? decErr.message : "Erreur");
    return null;
  }
}

/**
 * Liste les métadonnées des secrets pour l'interface d'administration.
 * Aucune valeur déchiffrée, ni ciphertext, ni iv n'est jamais exposée.
 */
export async function listSecretsMeta(): Promise<SecretMetadata[]> {
  const { data, error } = await supabaseAdmin
    .from("app_secrets")
    .select("name, label, last4, updated_at, key_version")
    .order("name");

  if (error) {
    console.error("[listSecretsMeta error]", error.message);
    throw new Error("Impossible de récupérer la liste des secrets.");
  }

  const secretsMap = new Map<string, { label: string; last4: string; updated_at: string; key_version: number }>();
  for (const item of data ?? []) {
    secretsMap.set(item.name, {
      label: item.label,
      last4: item.last4,
      updated_at: item.updated_at,
      key_version: item.key_version,
    });
  }

  const results: SecretMetadata[] = [];

  // Emplacements réservés (toujours visibles dans la liste)
  for (const slot of RESERVED_SECRET_SLOTS) {
    const existing = secretsMap.get(slot.name);
    if (existing) {
      results.push({
        name: slot.name,
        label: existing.label || slot.label,
        last4: existing.last4,
        updated_at: existing.updated_at,
        is_configured: true,
        key_version: existing.key_version,
      });
      secretsMap.delete(slot.name);
    } else {
      results.push({
        name: slot.name,
        label: slot.label,
        last4: "",
        updated_at: null,
        is_configured: false,
        key_version: 1,
      });
    }
  }

  // Autres secrets personnalisés éventuels
  for (const [name, info] of secretsMap.entries()) {
    results.push({
      name,
      label: info.label,
      last4: info.last4,
      updated_at: info.updated_at,
      is_configured: true,
      key_version: info.key_version,
    });
  }

  return results;
}

/**
 * Enregistre ou remplace un secret chiffré en base.
 */
export async function saveSecret(params: {
  name: string;
  label: string;
  value: string;
  userId?: string | null;
  userEmail?: string | null;
  requestHeaders?: Headers | null;
}): Promise<{ ok: true; last4: string }> {
  const cleanName = params.name.trim().toLowerCase();
  const cleanLabel = params.label.trim();
  const cleanValue = params.value.trim();

  if (!cleanName || cleanName.length > 64) {
    throw new Error("Le nom du secret est invalide.");
  }
  if (!cleanValue) {
    throw new Error("La valeur du secret ne peut pas être vide.");
  }

  // Chiffrement avec AES-256-GCM
  const encrypted = encryptValue(cleanValue);

  // Vérifier si existant pour journaliser create vs update
  const { data: existing } = await supabaseAdmin
    .from("app_secrets")
    .select("name")
    .eq("name", cleanName)
    .maybeSingle();

  const isUpdate = Boolean(existing);

  const { error } = await supabaseAdmin.from("app_secrets").upsert(
    {
      name: cleanName,
      label: cleanLabel || cleanName,
      value_encrypted: encrypted.value_encrypted,
      iv: encrypted.iv,
      tag: encrypted.tag,
      last4: encrypted.last4,
      key_version: encrypted.key_version,
      updated_by: params.userId || null,
    },
    { onConflict: "name" },
  );

  if (error) {
    await logAudit({
      action: isUpdate ? "secret.update" : "secret.create",
      target: cleanName,
      result: "failure",
      userId: params.userId,
      userEmail: params.userEmail,
      details: { error: "Erreur écriture base" },
      requestHeaders: params.requestHeaders,
    });
    throw new Error("Échec de l'enregistrement du secret.");
  }

  await logAudit({
    action: isUpdate ? "secret.update" : "secret.create",
    target: cleanName,
    result: "success",
    userId: params.userId,
    userEmail: params.userEmail,
    details: { label: cleanLabel, last4: encrypted.last4 },
    requestHeaders: params.requestHeaders,
  });

  return { ok: true, last4: encrypted.last4 };
}

/**
 * Supprime un secret de la base.
 */
export async function deleteSecret(params: {
  name: string;
  userId?: string | null;
  userEmail?: string | null;
  requestHeaders?: Headers | null;
}): Promise<{ ok: boolean }> {
  const cleanName = params.name.trim().toLowerCase();

  const { error } = await supabaseAdmin.from("app_secrets").delete().eq("name", cleanName);

  if (error) {
    await logAudit({
      action: "secret.delete",
      target: cleanName,
      result: "failure",
      userId: params.userId,
      userEmail: params.userEmail,
      requestHeaders: params.requestHeaders,
    });
    throw new Error("Impossible de supprimer le secret.");
  }

  await logAudit({
    action: "secret.delete",
    target: cleanName,
    result: "success",
    userId: params.userId,
    userEmail: params.userEmail,
    requestHeaders: params.requestHeaders,
  });

  return { ok: true };
}

/**
 * Teste le déchiffrement d'un secret sans jamais renvoyer sa valeur en clair.
 */
export async function testSecretDecryption(params: {
  name: string;
  userId?: string | null;
  userEmail?: string | null;
  requestHeaders?: Headers | null;
}): Promise<{ ok: boolean; message: string; last4?: string }> {
  const cleanName = params.name.trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from("app_secrets")
    .select("name, label, value_encrypted, iv, tag, last4")
    .eq("name", cleanName)
    .maybeSingle();

  if (error || !data) {
    await logAudit({
      action: "secret.test",
      target: cleanName,
      result: "failure",
      userId: params.userId,
      userEmail: params.userEmail,
      details: { reason: "Secret non trouvé" },
      requestHeaders: params.requestHeaders,
    });
    return { ok: false, message: "Ce secret n'est pas encore configuré." };
  }

  try {
    const decrypted = decryptValue({
      value_encrypted: data.value_encrypted,
      iv: data.iv,
      tag: data.tag,
    });

    if (!decrypted) throw new Error("Résultat vide");

    await logAudit({
      action: "secret.test",
      target: cleanName,
      result: "success",
      userId: params.userId,
      userEmail: params.userEmail,
      details: { last4: data.last4 },
      requestHeaders: params.requestHeaders,
    });

    return {
      ok: true,
      message: `Déchiffrement réussi (terminaison ••••${data.last4}). Intégrité cryptographique vérifiée.`,
      last4: data.last4,
    };
  } catch (err) {
    await logAudit({
      action: "secret.test",
      target: cleanName,
      result: "failure",
      userId: params.userId,
      userEmail: params.userEmail,
      details: { error: err instanceof Error ? err.message : "Déchiffrement échoué" },
      requestHeaders: params.requestHeaders,
    });

    return {
      ok: false,
      message: "Échec du déchiffrement : la clé maître a peut-être changé ou la donnée est altérée.",
    };
  }
}

/**
 * Rotation de la clé maître sans perte de données.
 * Déchiffre tous les secrets avec l'ancienne clé et les ré-enchiffre avec la nouvelle clé.
 */
export async function rotateMasterKey(params: {
  oldKey: string;
  newKey: string;
  userId?: string | null;
  userEmail?: string | null;
  requestHeaders?: Headers | null;
}): Promise<{ ok: boolean; count: number }> {
  // Valide les deux clés
  parseMasterKey(params.oldKey);
  parseMasterKey(params.newKey);

  const { data: allSecrets, error } = await supabaseAdmin
    .from("app_secrets")
    .select("id, name, label, value_encrypted, iv, tag, key_version");

  if (error) throw new Error("Impossible de lire les secrets pour la rotation.");

  let reencryptedCount = 0;

  for (const s of allSecrets ?? []) {
    // 1. Déchiffrement avec l'ancienne clé
    const decrypted = decryptValue(
      {
        value_encrypted: s.value_encrypted,
        iv: s.iv,
        tag: s.tag,
      },
      params.oldKey,
    );

    // 2. Chiffrement avec la nouvelle clé et nouveau nonce/iv aléatoire
    const newEncrypted = encryptValue(decrypted, (s.key_version ?? 1) + 1, params.newKey);

    // 3. Mise à jour en base
    const { error: updateError } = await supabaseAdmin
      .from("app_secrets")
      .update({
        value_encrypted: newEncrypted.value_encrypted,
        iv: newEncrypted.iv,
        tag: newEncrypted.tag,
        last4: newEncrypted.last4,
        key_version: newEncrypted.key_version,
      })
      .eq("id", s.id);

    if (updateError) {
      throw new Error(`Échec de la rotation sur le secret ${s.name} : ${updateError.message}`);
    }
    reencryptedCount++;
  }

  await logAudit({
    action: "secret.rotate",
    target: "all_secrets",
    result: "success",
    userId: params.userId,
    userEmail: params.userEmail,
    details: { secrets_count: reencryptedCount },
    requestHeaders: params.requestHeaders,
  });

  return { ok: true, count: reencryptedCount };
}
