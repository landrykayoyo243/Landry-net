import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getBaseUrl(request: Request): string {
  const envUrl = process.env["VITE_SITE_URL"] || process.env["SITE_URL"];
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return "https://landryit.com";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = getBaseUrl(request);
        const today = new Date().toISOString().split("T")[0];

        let publishedProjects: Array<{ slug: string; lastmod: string }> = [];

        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const supabaseKey =
          process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

        if (supabaseUrl && supabaseKey) {
          try {
            const client = createClient<Database>(supabaseUrl, supabaseKey, {
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
              global: {
                fetch: (input, init) => {
                  const h = new Headers(init?.headers);
                  if (supabaseKey.startsWith("sb_") && h.get("Authorization") === `Bearer ${supabaseKey}`) {
                    h.delete("Authorization");
                  }
                  h.set("apikey", supabaseKey);
                  return fetch(input, { ...init, headers: h });
                },
              },
            });

            const { data, error } = await client
              .from("projects")
              .select("slug, updated_at, created_at")
              .eq("status", "published")
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true });

            if (!error && data) {
              publishedProjects = data.map((p) => ({
                slug: p.slug,
                lastmod: (p.updated_at || p.created_at || today).split("T")[0],
              }));
            }
          } catch (err) {
            console.warn("⚠️ [sitemap] Erreur récupération Supabase:", (err as Error).message);
          }
        }

        // Fallback si Supabase est indisponible
        if (publishedProjects.length === 0) {
          const defaultSlugs = [
            "cluster-haute-disponibilite",
            "reseaux-pme",
            "securisation-systemes",
            "marketnet",
            "paylix",
          ];
          publishedProjects = defaultSlugs.map((slug) => ({ slug, lastmod: today }));
        }

        const staticPages = [
          { loc: `${baseUrl}/`, priority: "1.0", changefreq: "weekly", lastmod: today },
          { loc: `${baseUrl}/projets`, priority: "0.9", changefreq: "weekly", lastmod: today },
          { loc: `${baseUrl}/a-propos`, priority: "0.8", changefreq: "monthly", lastmod: today },
          { loc: `${baseUrl}/contact`, priority: "0.8", changefreq: "monthly", lastmod: today },
        ];

        const projectPages = publishedProjects.map((p) => ({
          loc: `${baseUrl}/projets/${p.slug}`,
          priority: "0.8",
          changefreq: "monthly",
          lastmod: p.lastmod,
        }));

        const allUrls = [...staticPages, ...projectPages];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
