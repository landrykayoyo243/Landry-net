import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  parseMasterKey,
  encryptValue,
  decryptValue,
  saveSecret,
  deleteSecret,
  testSecretDecryption,
  rotateMasterKey,
  listSecretsMeta,
} from "@/lib/secrets.server";
import { maskIp, extractDevice, sanitizeLogDetails } from "@/lib/audit.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { verifyAdminRequest } from "@/lib/server-auth";
import fs from "node:fs";
import path from "node:path";

// Clés maîtres de test (32 octets = 64 caractères hex)
const TEST_KEY_1 = crypto.randomBytes(32).toString("hex");
const TEST_KEY_2 = crypto.randomBytes(32).toString("hex");

describe("PHASE A : Cryptographie & Coffre de secrets", () => {
  const originalEnvKey = process.env.APP_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = TEST_KEY_1;
  });

  afterEach(() => {
    if (originalEnvKey) {
      process.env.APP_ENCRYPTION_KEY = originalEnvKey;
    } else {
      delete process.env.APP_ENCRYPTION_KEY;
    }
  });

  it("1. Chiffre avec AES-256-GCM et produit un nonce unique à chaque appel", () => {
    const plain = "AIzaSyTestApiKey123456789";
    const enc1 = encryptValue(plain);
    const enc2 = encryptValue(plain);

    expect(enc1.value_encrypted).toBeDefined();
    expect(enc2.value_encrypted).toBeDefined();
    // Le chiffrement avec nonce aléatoire DOIT produire deux textes chiffrés différents
    expect(enc1.value_encrypted).not.toEqual(enc2.value_encrypted);
    expect(enc1.iv).not.toEqual(enc2.iv);
    expect(enc1.tag).toBeDefined();
    expect(enc1.last4).toBe("6789");
  });

  it("2. Déchiffre correctement la valeur chiffrée avec la clé maître", () => {
    const plain = "secret-token-super-confidentiel-9876";
    const enc = encryptValue(plain);
    const dec = decryptValue(enc);
    expect(dec).toBe(plain);
  });

  it("3. Refuse le déchiffrement si le tag d'authentification GCM est altéré", () => {
    const plain = "valeur-a-proteger";
    const enc = encryptValue(plain);
    // Altération du tag
    const corruptedTag = enc.tag.slice(0, -2) + (enc.tag.endsWith("aa") ? "bb" : "aa");
    expect(() => {
      decryptValue({ ...enc, tag: corruptedTag });
    }).toThrow();
  });

  it("4. Refuse proprement si APP_ENCRYPTION_KEY est absente (aucun stockage en clair)", () => {
    delete process.env.APP_ENCRYPTION_KEY;

    expect(() => parseMasterKey(null)).toThrow(
      "La clé maître de chiffrement (APP_ENCRYPTION_KEY) n'est pas configurée sur le serveur.",
    );

    expect(() => encryptValue("test")).toThrow(
      "La clé maître de chiffrement (APP_ENCRYPTION_KEY) n'est pas configurée sur le serveur.",
    );
  });

  it("5. Valide que la clé maître doit faire exactement 32 octets", () => {
    expect(() => parseMasterKey("cle_trop_courte")).toThrow("La clé APP_ENCRYPTION_KEY est invalide");
    expect(() => parseMasterKey("a".repeat(30))).toThrow("La clé APP_ENCRYPTION_KEY est invalide");
  });

  it("6. Rotation de la clé maître : déchiffre avec l'ancienne et ré-enchiffre avec la nouvelle", () => {
    const secretContent = "mon-secret-qui-doit-survivre-a-la-rotation-4321";
    // Chiffrement initial avec TEST_KEY_1
    const initialEncrypted = encryptValue(secretContent, 1, TEST_KEY_1);

    // Déchiffrement avec l'ancienne clé
    const decryptedWithOld = decryptValue(initialEncrypted, TEST_KEY_1);
    expect(decryptedWithOld).toBe(secretContent);

    // Ré-enchiffrement avec la nouvelle clé
    const rotated = encryptValue(decryptedWithOld, 2, TEST_KEY_2);
    expect(rotated.key_version).toBe(2);

    // Doit pouvoir être déchiffré avec TEST_KEY_2
    const decryptedWithNew = decryptValue(rotated, TEST_KEY_2);
    expect(decryptedWithNew).toBe(secretContent);

    // Mais échouer si on essaie de déchiffrer la nouvelle version avec TEST_KEY_1
    expect(() => {
      decryptValue(rotated, TEST_KEY_1);
    }).toThrow();
  });
});

describe("PHASE A : Journal d'audit et protection des données sensibles", () => {
  it("7. Masque les adresses IP (IPv4 et IPv6)", () => {
    expect(maskIp("192.168.1.145")).toBe("192.168.1.xxx");
    expect(maskIp("10.0.0.8")).toBe("10.0.0.xxx");
    expect(maskIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:0db8:85a3::xxxx");
    expect(maskIp("127.0.0.1")).toBe("127.0.0.xxx");
    expect(maskIp(null)).toBe("127.0.0.xxx");
  });

  it("8. Extrait un appareil lisible à partir du User-Agent", () => {
    const chromeWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(extractDevice(chromeWin)).toContain("Chrome");
    expect(extractDevice(chromeWin)).toContain("Windows");

    const safariMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(extractDevice(safariMac)).toContain("Safari");
    expect(extractDevice(safariMac)).toContain("macOS");
  });

  it("9. Assainit récursivement les détails de log pour éliminer les mots de passe et clés", () => {
    const rawDetails = {
      user_action: "test",
      password: "SuperSecretPassword123!",
      api_key: "AIzaSySecretToken",
      nested: {
        token: "bearer_xyz",
        public_info: "ok",
      },
    };

    const sanitized = sanitizeLogDetails(rawDetails);
    expect(sanitized.user_action).toBe("test");
    expect(sanitized.password).toBe("[MASQUÉ]");
    expect(sanitized.api_key).toBe("[MASQUÉ]");
    expect((sanitized.nested as Record<string, unknown>).token).toBe("[MASQUÉ]");
    expect((sanitized.nested as Record<string, unknown>).public_info).toBe("ok");
  });
});

describe("PHASE A : Limitation de débit (Rate limiting) & Contrôle d'accès", () => {
  it("10. Le limiteur de débit bloque après dépassement du quota", () => {
    const testIp = `test_ip_${Date.now()}`;
    const opts = { windowMs: 10_000, max: 3 };

    expect(checkRateLimit(testIp, opts).allowed).toBe(true);
    expect(checkRateLimit(testIp, opts).allowed).toBe(true);
    expect(checkRateLimit(testIp, opts).allowed).toBe(true);

    const blocked = checkRateLimit(testIp, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("11. verifyAdminRequest refuse les requêtes sans Bearer token (401)", async () => {
    const req = new Request("http://localhost/api/admin/secrets");
    const auth = await verifyAdminRequest(req);
    expect(auth.authorized).toBe(false);
    if (!auth.authorized) {
      expect(auth.status).toBe(401);
      expect(auth.error).toContain("Connexion requise");
    }
  });

  it("12. verifyAdminRequest refuse les faux tokens ou tokens invalides (401)", async () => {
    const req = new Request("http://localhost/api/admin/secrets", {
      headers: { Authorization: "Bearer faux.token.invalide" },
    });
    const auth = await verifyAdminRequest(req);
    expect(auth.authorized).toBe(false);
    if (!auth.authorized) {
      expect(auth.status).toBe(401);
    }
  });
});

describe("PHASE A : Isolement du site public (bundle public inchangé)", () => {
  it("13. Vérifie que les routes publiques n'importent ni les secrets ni les modules d'administration", () => {
    const publicRouteFiles = [
      "src/routes/index.tsx",
      "src/routes/projets.index.tsx",
      "src/routes/a-propos.tsx",
      "src/routes/contact.tsx",
    ];

    for (const relPath of publicRouteFiles) {
      const fullPath = path.resolve(relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      // Vérification qu'aucun module crypto serveur ni API admin n'est importé
      expect(content).not.toContain("secrets.server");
      expect(content).not.toContain("audit.server");
      expect(content).not.toContain("admin-api-client");
      expect(content).not.toContain("APP_ENCRYPTION_KEY");
    }
  });
});
