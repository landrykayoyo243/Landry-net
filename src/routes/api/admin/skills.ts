import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";
import {
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillVersions,
} from "@/lib/skills.server";

const createSkillSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Le slug ne doit contenir que des lettres minuscules, des chiffres et des tirets"),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  content: z.string().min(1).max(20000),
});

const updateSkillSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(20000).optional(),
  is_active: z.boolean().optional(),
});

const deleteSkillSchema = z.object({
  id: z.string().uuid(),
});

export const Route = createFileRoute("/api/admin/skills")({
  server: {
    handlers: {
      /** GET : Liste tous les skills (+ historique si ?id=xxx) */
      GET: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`skills_get_${ip}`, { windowMs: 60_000, max: 60 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes. Veuillez patienter." }, 429);
        }

        const url = new URL(request.url);
        const skillId = url.searchParams.get("id");

        try {
          if (skillId) {
            const versions = await getSkillVersions(skillId);
            return jsonResponse({ versions });
          }

          const skills = await listSkills();
          return jsonResponse({ skills });
        } catch (err) {
          console.error("[api/admin/skills GET]", err);
          return jsonResponse({ error: "Impossible de charger les skills." }, 500);
        }
      },

      /** POST : Créer un nouveau skill */
      POST: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`skills_post_${ip}`, { windowMs: 60_000, max: 20 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes. Veuillez patienter." }, 429);
        }

        const body = await request.json().catch(() => null);
        const parsed = createSkillSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: parsed.error.issues[0]?.message || "Données invalides." },
            400,
          );
        }

        try {
          const skill = await createSkill(parsed.data, {
            userId: auth.user.id,
            userEmail: auth.user.email,
            headers: request.headers,
          });
          return jsonResponse({ success: true, skill });
        } catch (err) {
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Impossible de créer le skill." },
            400,
          );
        }
      },

      /** PATCH : Modifier un skill existant */
      PATCH: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const body = await request.json().catch(() => null);
        const parsed = updateSkillSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: parsed.error.issues[0]?.message || "Données invalides." },
            400,
          );
        }

        try {
          const { id, ...updates } = parsed.data;
          const skill = await updateSkill(id, updates, {
            userId: auth.user.id,
            userEmail: auth.user.email,
            headers: request.headers,
          });
          return jsonResponse({ success: true, skill });
        } catch (err) {
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Impossible de modifier le skill." },
            400,
          );
        }
      },

      /** DELETE : Supprimer un skill non-système */
      DELETE: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const body = await request.json().catch(() => null);
        const parsed = deleteSkillSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "ID de skill invalide." }, 400);
        }

        try {
          await deleteSkill(parsed.data.id, {
            userId: auth.user.id,
            userEmail: auth.user.email,
            headers: request.headers,
          });
          return jsonResponse({ success: true });
        } catch (err) {
          return jsonResponse(
            { error: err instanceof Error ? err.message : "Impossible de supprimer le skill." },
            400,
          );
        }
      },
    },
  },
});
