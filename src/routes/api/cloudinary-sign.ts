import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/cloudinary-sign
 * Génère une signature Cloudinary pour un upload direct depuis le navigateur.
 * Réservé aux administrateurs authentifiés. La clé secrète ne quitte jamais le serveur.
 *
 * Body : { folder?: string; resource_type?: "image" | "raw" }
 */
export const Route = createFileRoute("/api/cloudinary-sign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Auth : on vérifie la session Supabase ──────────────────────────
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return json({ error: "Unauthorized" }, 401);

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: userData } = await supabase.auth.getUser(token);
        if (!userData.user) return json({ error: "Unauthorized" }, 401);

        // Vérification du rôle admin
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (!isAdmin) return json({ error: "Forbidden" }, 403);

        // ── Signature Cloudinary ───────────────────────────────────────────
        const body = (await request.json().catch(() => ({}))) as {
          folder?: string;
          resource_type?: string;
        };

        const cloudName = process.env["CLOUDINARY_CLOUD_NAME"]!;
        const apiKey = process.env["CLOUDINARY_API_KEY"]!;
        const apiSecret = process.env["CLOUDINARY_API_SECRET"]!;
        const baseFolder = (process.env["CLOUDINARY_FOLDER"] || "Landry_Media")
          .trim()
          .replace(/^\/+|\/+$/g, "");

        // Organisation propre en sous-dossiers dans le dossier principal
        let folder = baseFolder;
        if (body.folder && typeof body.folder === "string" && body.folder.trim()) {
          const sub = body.folder.trim().replace(/^\/+|\/+$/g, "");
          folder = sub.startsWith(baseFolder) ? sub : `${baseFolder}/${sub}`;
        } else {
          // Classement par défaut selon le type de ressource
          const defaultSub = body.resource_type === "raw" ? "cv" : "medias";
          folder = `${baseFolder}/${defaultSub}`;
        }

        if (!cloudName || !apiKey || !apiSecret) {
          return json({ error: "Cloudinary non configuré" }, 500);
        }

        const timestamp = Math.floor(Date.now() / 1000);
        // La signature Cloudinary v1 = SHA-1( "param1=v1&param2=v2" + apiSecret )
        const toSign = `folder=${folder}&timestamp=${timestamp}`;
        const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

        return json({ signature, timestamp, apiKey, cloudName, folder });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
