import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Charger .env si présent
try {
  const envPath = path.join(rootDir, ".env");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignorer l'erreur si pas de fichier .env
}

export async function generateSitemapAndRobots() {
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const rawUrl = process.env.VITE_SITE_URL || "";
  const siteUrl = rawUrl.trim().replace(/\/+$/, "");

  if (!siteUrl) {
    if (isProd) {
      throw new Error(
        "❌ [Sitemap/Robots] La variable VITE_SITE_URL est obligatoire en production (ex: https://landryit.com)."
      );
    }
    console.warn("⚠️ [Sitemap/Robots] VITE_SITE_URL non définie, utilisation de http://localhost:8080 pour le dev");
  }

  const effectiveSiteUrl = siteUrl || "http://localhost:8080";

  // Récupérer les projets publiés depuis Supabase
  let publishedSlugs = [];
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const headers = {
        apikey: supabaseKey,
      };
      if (!supabaseKey.startsWith("sb_")) {
        headers["Authorization"] = `Bearer ${supabaseKey}`;
      }
      const res = await fetch(
        `${supabaseUrl}/rest/v1/projects?select=slug,updated_at,created_at&status=eq.published&order=sort_order.asc`,
        { headers }
      );
      if (res.ok) {
        const items = await res.json();
        publishedSlugs = items.map((p) => ({
          slug: p.slug,
          lastmod: (p.updated_at || p.created_at || new Date().toISOString()).split("T")[0],
        }));
      }
    } catch (err) {
      console.warn("⚠️ Impossible de joindre Supabase REST pour le sitemap:", err.message);
    }
  }

  // Fallback si Supabase REST a échoué mais LOVABLE_DB_MIGRATION_URL est dispo
  if (publishedSlugs.length === 0 && process.env.LOVABLE_DB_MIGRATION_URL) {
    try {
      const postgresModule = await import("postgres");
      const postgres = postgresModule.default || postgresModule;
      const sql = postgres(process.env.LOVABLE_DB_MIGRATION_URL, { ssl: "require", max: 1 });
      const rows = await sql`
        SELECT slug, updated_at, created_at 
        FROM projects 
        WHERE status = 'published' 
        ORDER BY sort_order ASC
      `;
      publishedSlugs = rows.map((p) => ({
        slug: p.slug,
        lastmod: (p.updated_at || p.created_at || new Date().toISOString()).split("T")[0],
      }));
      await sql.end();
    } catch {
      // Ignorer
    }
  }

  // Si toujours vide (offline), fallback sur les 5 projets standard
  if (publishedSlugs.length === 0) {
    const defaultSlugs = [
      "cluster-haute-disponibilite",
      "reseaux-pme",
      "securisation-systemes",
      "marketnet",
      "paylix",
    ];
    const today = new Date().toISOString().split("T")[0];
    publishedSlugs = defaultSlugs.map((slug) => ({ slug, lastmod: today }));
  }

  const today = new Date().toISOString().split("T")[0];

  // Construction du sitemap.xml
  const staticPages = [
    { loc: `${effectiveSiteUrl}/`, priority: "1.0", changefreq: "weekly", lastmod: today },
    { loc: `${effectiveSiteUrl}/projets`, priority: "0.9", changefreq: "weekly", lastmod: today },
    { loc: `${effectiveSiteUrl}/a-propos`, priority: "0.8", changefreq: "monthly", lastmod: today },
    { loc: `${effectiveSiteUrl}/contact`, priority: "0.8", changefreq: "monthly", lastmod: today },
  ];

  const projectUrls = publishedSlugs.map((p) => ({
    loc: `${effectiveSiteUrl}/projets/${p.slug}`,
    priority: "0.8",
    changefreq: "monthly",
    lastmod: p.lastmod,
  }));

  const allUrls = [...staticPages, ...projectUrls];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  // Construction du robots.txt
  const robotsTxt = `# Généré automatiquement à chaque compilation avec VITE_SITE_URL
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: *
Disallow: /admin
Disallow: /admin/
Disallow: /admin_/
Disallow: /connexion-requise
Disallow: /acces-refuse
Allow: /

Sitemap: ${effectiveSiteUrl}/sitemap.xml
`;

  const publicDir = path.join(rootDir, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Nettoyer l'ancien sitemap.xml statique s'il existe pour laisser la route dynamique SSR répondre
  const sitemapPath = path.join(publicDir, "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    try {
      fs.unlinkSync(sitemapPath);
      console.log("🧹 [Sitemap/Robots] Ancien sitemap.xml statique retiré (géré dynamiquement par TanStack Start)");
    } catch {
      // Ignorer
    }
  }

  const robotsPath = path.join(publicDir, "robots.txt");
  fs.writeFileSync(robotsPath, robotsTxt.trim() + "\n", "utf-8");

  console.log(`✅ [Sitemap/Robots] robots.txt généré pointant vers ${effectiveSiteUrl}/sitemap.xml`);
  console.log(`ℹ️ [Sitemap/Robots] sitemap.xml est désormais dynamique en temps réel via la route /sitemap.xml`);
}

// Exécution directe si appelé en script CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemapAndRobots().catch((err) => {
    console.error("❌ Erreur génération sitemap/robots:", err);
    process.exit(1);
  });
}
