import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SitemapPage = {
  loc: string;
  lastmod: string;
  priority: string;
  changefreq: string;
  images?: string[];
};

function getBaseUrl(request: Request): string {
  const envUrl = process.env["VITE_SITE_URL"] || process.env["SITE_URL"];
  if (envUrl?.trim()) return envUrl.trim().replace(/\/+$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return "https://landryit.com";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteImageUrl(imageUrl: string | null | undefined, baseUrl: string): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}/${value.replace(/^\/+/, "")}`;
}

function collectImageUrls(values: unknown[], baseUrl: string): string[] {
  const found = new Set<string>();
  const visited = new Set<object>();
  const imageKey = /^(src|srcset|url|image|image_url|cover_url|thumbnail|thumbnail_url)$/i;
  const isImageUrl = (value: string) =>
    /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value) || value.includes("res.cloudinary.com");

  const add = (value: string) => {
    const normalized = absoluteImageUrl(value, baseUrl);
    if (normalized && isImageUrl(normalized)) found.add(normalized);
  };

  const visit = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (imageKey.test(key)) add(value);
      const imgTags = value.matchAll(/<img\b[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"']/gi);
      for (const match of imgTags) add(match[1]);
      // Prend en charge les URLs d'images stockées dans du HTML ou des blocs sérialisés.
      const urls = value.matchAll(/(?:https?:\/\/|\/)[^\s\"'<>]+?\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s\"'<>]*)?/gi);
      for (const match of urls) add(match[0]);
      return;
    }
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }
    for (const [childKey, childValue] of Object.entries(value)) visit(childValue, childKey);
  };

  values.forEach((value) => visit(value));
  return [...found];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = getBaseUrl(request);
        const today = new Date().toISOString().split("T")[0];
        let publishedProjects: Array<{ slug: string; lastmod: string; images: string[] }> = [];
        let publishedBlogPosts: Array<{ slug: string; lastmod: string; images: string[] }> = [];

        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

        if (supabaseUrl && supabaseKey) {
          try {
            const client = createClient<Database>(supabaseUrl, supabaseKey, {
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
              global: {
                fetch: (input, init) => {
                  const headers = new Headers(init?.headers);
                  if (supabaseKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
                    headers.delete("Authorization");
                  }
                  headers.set("apikey", supabaseKey);
                  return fetch(input, { ...init, headers });
                },
              },
            });

            const [{ data: projects, error: projectsError }, { data: posts, error: postsError }] = await Promise.all([
              client.from("projects").select("slug, updated_at, created_at, image_url, content").eq("status", "published"),
              client.from("blog_posts").select("slug, updated_at, published_at, created_at, cover_url, content").eq("status", "published"),
            ]);

            if (projectsError) {
              console.warn("[sitemap] Erreur projets:", projectsError.message);
            } else {
              publishedProjects = (projects ?? []).map((project) => ({
                slug: project.slug,
                lastmod: (project.updated_at || project.created_at || today).split("T")[0],
                images: collectImageUrls([project.image_url, project.content], baseUrl),
              }));
            }

            if (postsError) {
              console.warn("[sitemap] Erreur articles:", postsError.message);
            } else {
              publishedBlogPosts = (posts ?? []).map((post) => ({
                slug: post.slug,
                lastmod: (post.updated_at || post.published_at || post.created_at || today).split("T")[0],
                images: collectImageUrls([post.cover_url, post.content], baseUrl),
              }));
            }
          } catch (error) {
            console.warn("[sitemap] Erreur récupération Supabase:", (error as Error).message);
          }
        }

        const staticPages: SitemapPage[] = [
          { loc: `${baseUrl}/`, priority: "1.0", changefreq: "weekly", lastmod: today },
          { loc: `${baseUrl}/projets`, priority: "0.9", changefreq: "weekly", lastmod: today },
          { loc: `${baseUrl}/blog`, priority: "0.9", changefreq: "weekly", lastmod: today },
          { loc: `${baseUrl}/a-propos`, priority: "0.8", changefreq: "monthly", lastmod: today },
          { loc: `${baseUrl}/contact`, priority: "0.8", changefreq: "monthly", lastmod: today },
        ];

        const projectPages: SitemapPage[] = publishedProjects.map((project) => ({
          loc: `${baseUrl}/projets/${project.slug}`,
          lastmod: project.lastmod,
          priority: "0.8",
          changefreq: "monthly",
          images: project.images,
        }));

        const blogPages: SitemapPage[] = publishedBlogPosts.map((post) => ({
          loc: `${baseUrl}/blog/${post.slug}`,
          lastmod: post.lastmod,
          priority: "0.8",
          changefreq: "weekly",
          images: post.images,
        }));

        const pages = [...staticPages, ...projectPages, ...blogPages];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map((page) => `  <url>
    <loc>${escapeXml(page.loc)}</loc>
    <lastmod>${escapeXml(page.lastmod)}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${(page.images ?? []).map((image) => `\n    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`).join("")}
  </url>`).join("\n")}
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
