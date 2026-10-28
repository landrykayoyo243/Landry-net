import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import {
  saveSecret,
  testSecretDecryption,
  deleteSecret,
  listSecretsMeta,
  getSecret,
} from "@/lib/secrets.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TEST_SECRET_NAME = `test_secret_${Date.now()}`;
const TEST_SECRET_LABEL = "Secret temporaire de test";
const TEST_SECRET_VALUE = "valeur-ultra-secrete-pour-le-test-123456789";

describe("PHASE A : Tests réels avec la base de données Supabase", { timeout: 15000 }, () => {
  beforeAll(() => {
    // Clé maître de test temporaire si non définie
    if (!process.env.APP_ENCRYPTION_KEY) {
      process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    }
  });

  afterAll(async () => {
    // Nettoyage impératif : aucune donnée de test ne reste en base
    try {
      await supabaseAdmin.from("app_secrets").delete().eq("name", TEST_SECRET_NAME);
      await supabaseAdmin.from("audit_log").delete().eq("target", TEST_SECRET_NAME);
    } catch (err) {
      console.error("Erreur nettoyage test :", err);
    }
  });

  it("1. Crée un secret en base : chiffré en AES-256-GCM et last4 calculé", async () => {
    const res = await saveSecret({
      name: TEST_SECRET_NAME,
      label: TEST_SECRET_LABEL,
      value: TEST_SECRET_VALUE,
    });

    expect(res.ok).toBe(true);
    expect(res.last4).toBe("6789");

    // Vérification directe dans la base : la valeur stockée DOIT être chiffrée, jamais en clair !
    const { data: dbRow, error } = await supabaseAdmin
      .from("app_secrets")
      .select("name, value_encrypted, iv, tag, last4")
      .eq("name", TEST_SECRET_NAME)
      .single();

    expect(error).toBeNull();
    expect(dbRow).toBeDefined();
    expect(dbRow.value_encrypted).not.toBe(TEST_SECRET_VALUE);
    expect(dbRow.value_encrypted).not.toContain("valeur-ultra-secrete");
    expect(dbRow.iv).toBeDefined();
    expect(dbRow.tag).toBeDefined();
    expect(dbRow.last4).toBe("6789");
  });

  it("2. La fonction interne getSecret déchiffre la valeur côté serveur", async () => {
    const decrypted = await getSecret(TEST_SECRET_NAME);
    expect(decrypted).toBe(TEST_SECRET_VALUE);
  });

  it("3. listSecretsMeta ne renvoie JAMAIS la valeur en clair ni le ciphertext", async () => {
    const list = await listSecretsMeta();
    const found = list.find((s) => s.name === TEST_SECRET_NAME);

    expect(found).toBeDefined();
    expect(found?.is_configured).toBe(true);
    expect(found?.last4).toBe("6789");

    // Vérifie qu'aucun champ sensible n'existe sur l'objet renvoyé
    const record = found as unknown as Record<string, unknown>;
    expect(record["value"]).toBeUndefined();
    expect(record["value_encrypted"]).toBeUndefined();
    expect(record["iv"]).toBeUndefined();
    expect(record["tag"]).toBeUndefined();
  });

  it("4. Teste le déchiffrement sans exposer la valeur complète", async () => {
    const testResult = await testSecretDecryption({ name: TEST_SECRET_NAME });
    expect(testResult.ok).toBe(true);
    expect(testResult.message).toContain("••••6789");
    expect(testResult.message).not.toContain(TEST_SECRET_VALUE);
  });

  it("5. Vérifie qu'une entrée d'audit a été inscrite lors de la création", async () => {
    const { data: auditEntries } = await supabaseAdmin
      .from("audit_log")
      .select("action, target, result, details, ip_masked")
      .eq("target", TEST_SECRET_NAME)
      .order("created_at", { ascending: false });

    expect(auditEntries).toBeDefined();
    expect(auditEntries!.length).toBeGreaterThanOrEqual(1);

    const first = auditEntries![0];
    expect(first.target).toBe(TEST_SECRET_NAME);
    expect(first.result).toBe("success");
    // Vérification qu'aucun secret n'est présent dans le journal
    const jsonStr = JSON.stringify(first);
    expect(jsonStr).not.toContain(TEST_SECRET_VALUE);
  });

  it("6. Supprime le secret et nettoie la base", async () => {
    const delRes = await deleteSecret({ name: TEST_SECRET_NAME });
    expect(delRes.ok).toBe(true);

    const check = await getSecret(TEST_SECRET_NAME);
    expect(check).toBeNull();
  });
});
