import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdminRequest, jsonResponse } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";
import { pruneAuditLogs } from "@/lib/audit.server";

export const Route = createFileRoute("/api/admin/audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAdminRequest(request);
        if (!auth.authorized) {
          return jsonResponse({ error: auth.error }, auth.status);
        }

        const ip = getClientIp(request);
        const limit = checkRateLimit(`audit_get_${ip}`, { windowMs: 60_000, max: 60 });
        if (!limit.allowed) {
          return jsonResponse({ error: "Trop de requêtes. Veuillez patienter." }, 429);
        }

        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
        const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
        const actionFilter = url.searchParams.get("action")?.trim();
        const dateFrom = url.searchParams.get("dateFrom")?.trim();
        const dateTo = url.searchParams.get("dateTo")?.trim();
        const autoPrune = url.searchParams.get("prune") === "true";

        if (autoPrune) {
          // Purge sécurisée des logs de plus de 90 jours
          await pruneAuditLogs(90);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabaseAdmin
          .from("audit_log")
          .select("id, created_at, user_email, action, target, result, details, approx_country, approx_device, ip_masked", { count: "exact" });

        if (actionFilter && actionFilter !== "all") {
          query = query.eq("action", actionFilter);
        }
        if (dateFrom) {
          query = query.gte("created_at", new Date(dateFrom).toISOString());
        }
        if (dateTo) {
          // Fin de la journée pour inclure toute la date
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte("created_at", endOfDay.toISOString());
        }

        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data, count, error } = await query;

        if (error) {
          console.error("[api/admin/audit GET]", error.message);
          return jsonResponse({ error: "Impossible de récupérer le journal d'audit." }, 500);
        }

        const total = count ?? 0;
        const totalPages = Math.ceil(total / pageSize) || 1;

        return jsonResponse({
          logs: data ?? [],
          pagination: {
            page,
            pageSize,
            total,
            totalPages,
          },
        });
      },
    },
  },
});
