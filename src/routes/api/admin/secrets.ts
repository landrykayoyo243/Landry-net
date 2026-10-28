import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";
import {
  listSecretsMeta,
  saveSecret,
  deleteSecret,
  testSecretDecryption,
  rotateMasterKey,
} from "@/lib/secrets.server";

const saveSchema = z.object({
  name: z.string().min(1, "Nom requis").max(64).regex(/^[a-z0-9_]+$/, "Nom en minuscules, chiffres et underscores uniquement"),
  label: z.string().min(1, "Libellé requis").max(100),
  value: z.string().min(1, "Valeur requise").max(4096),
});

const deleteSchema = z.object({
  name: z.string().min(1).max(64),
});

const testSchema = z.object({
  name: z.string().min(1).max(64),
});

const rotateSchema = z.object({
  oldKey: z.string().min(32, "Ancienne clé requise"),
  newKey: z.string().min(32, "Nouvelle clé requise"),
});

export const Route = createFileRoute("/api/admin/secrets")({
  server: {
    handlers: {
      /** GET : Lister les secrets (métadonnées uniquement, jamais les valeurs) */
      GET: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`secrets_get_${ip}`, { windowMs: 60_000, max: 60 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes. Veuillez patienter." }, 429);
        }

        try {
          const secrets = await listSecretsMeta();
          return jsonResponse({ secrets });
        } catch (err) {
          console.error("[api/admin/secrets GET]", err);
          return jsonResponse({ error: "Impossible de récupérer les secrets." }, 500);
        }
      },

      /** POST : Ajouter ou remplacer un secret chiffré */
      POST: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`secrets_post_${ip}`, { windowMs: 60_000, max: 20 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de tentatives. Veuillez patienter." }, 429);
        }

        const body = await request.json().catch(() => null);
        const parsed = saveSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: parsed.error.issues[0]?.message || "Données invalides." },
            400,
          );
        }

        try {
          const result = await saveSecret({
            name: parsed.data.name,
            label: parsed.data.label,
            value: parsed.data.value,
            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          return jsonResponse({ success: true, last4: result.last4 });
        } catch (err) {
          console.error("[api/admin/secrets POST]", err);
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Erreur lors de l'enregistrement." },
            500,
          );
        }
      },

      /** DELETE : Supprimer un secret */
      DELETE: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`secrets_del_${ip}`, { windowMs: 60_000, max: 20 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de tentatives. Veuillez patienter." }, 429);
        }

        const body = await request.json().catch(() => null);
        const parsed = deleteSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Nom de secret invalide." }, 400);
        }

        try {
          await deleteSecret({
            name: parsed.data.name,
            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[api/admin/secrets DELETE]", err);
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Erreur lors de la suppression." },
            500,
          );
        }
      },

      /** PATCH : Tester le déchiffrement d'un secret */
      PATCH: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`secrets_test_${ip}`, { windowMs: 60_000, max: 30 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de tests consécutifs. Veuillez patienter." }, 429);
        }

        const body = await request.json().catch(() => null);
        const parsed = testSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Nom de secret invalide." }, 400);
        }

        try {
          const testRes = await testSecretDecryption({
            name: parsed.data.name,
            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          return jsonResponse(testRes);
        } catch (err) {
          console.error("[api/admin/secrets PATCH]", err);
          return jsonResponse(
            { ok: false, error: "Échec du test de déchiffrement." },
            500,
          );
        }
      },

      /** PUT : Rotation de la clé maître */
      PUT: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`secrets_rot_${ip}`, { windowMs: 60_000, max: 5 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes de rotation." }, 429);
        }

        const body = await request.json().catch(() => null);
        const parsed = rotateSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Veuillez fournir l'ancienne clé et la nouvelle clé de 32 octets." },
            400,
          );
        }

        try {
          const res = await rotateMasterKey({
            oldKey: parsed.data.oldKey,
            newKey: parsed.data.newKey,
            userId: auth.user.id,
            userEmail: auth.user.email,
            requestHeaders: request.headers,
          });

          return jsonResponse({
            success: true,
            message: `Rotation terminée avec succès. ${res.count} secret(s) ré-enchiffré(s).`,
            count: res.count,
          });
        } catch (err) {
          console.error("[api/admin/secrets PUT]", err);
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Erreur pendant la rotation." },
            500,
          );
        }
      },
    },
  },
});
