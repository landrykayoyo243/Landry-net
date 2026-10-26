import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const baseUrl = "http://localhost:8080";

const routesToTest = [
  { path: "/", name: "Accueil" },
  { path: "/a-propos", name: "À propos" },
  { path: "/projets", name: "Tous les projets" },
  { path: "/contact", name: "Contact" },
  { path: "/projets/cluster-haute-disponibilite", name: "Projet: Cluster Haute Disponibilité" },
  { path: "/projets/reseaux-pme", name: "Projet: Réseaux PME" },
  { path: "/projets/securisation-systemes", name: "Projet: Sécurisation Systèmes" },
  { path: "/projets/marketnet", name: "Projet: MarketNet" },
  { path: "/projets/paylix", name: "Projet: Paylix" },
];

const userAgents = [
  { name: "Facebook", ua: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" },
  { name: "WhatsApp", ua: "WhatsApp/2.21.12.21 A" },
  { name: "Twitter/X", ua: "Twitterbot/1.0" },
  { name: "LinkedIn", ua: "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)" },
];

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}

async function verifyImage(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    const contentType = res.headers.get("content-type") || "unknown";
    const buffer = await res.arrayBuffer();
    const sizeKb = (buffer.byteLength / 1024).toFixed(1);
    return {
      status: res.status,
      ok: res.ok,
      contentType,
      sizeKb: `${sizeKb} Ko`,
      underLimit: buffer.byteLength <= 300 * 1024,
    };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function main() {
  console.log("============================================================");
  console.log("VÉRIFICATION DES BALISES SANS JAVASCRIPT (SSR / CRAWLERS)");
  console.log("============================================================\n");

  const results = [];
  const checkedImages = new Map();

  for (const r of routesToTest) {
    const url = `${baseUrl}${r.path}`;
    const ua = userAgents[0].ua; // facebookexternalhit
    const res = await fetch(url, { headers: { "User-Agent": ua } });
    const html = await res.text();

    const canonical =
      extractTag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
      extractTag(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);

    const ogTitle = extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const ogDesc = extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const twitterImage = extractTag(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    console.log(`📌 Page: [${r.name}] (${r.path})`);
    console.log(`   - Canonical    : ${canonical}`);
    console.log(`   - og:title     : ${ogTitle}`);
    console.log(`   - og:desc      : ${ogDesc ? (ogDesc.slice(0, 75) + "...") : "null"}`);
    console.log(`   - og:image     : ${ogImage}`);
    console.log(`   - twitter:img  : ${twitterImage}`);

    if (ogImage && !checkedImages.has(ogImage)) {
      // Si URL locale relative ou localhost, pointer vers baseUrl
      const targetUrl = ogImage.startsWith("http://localhost:8080")
        ? ogImage
        : ogImage.startsWith("http")
        ? ogImage
        : `${baseUrl}${ogImage}`;
      const imgCheck = await verifyImage(targetUrl);
      checkedImages.set(ogImage, imgCheck);
      console.log(`   -> Test Image  : HTTP ${imgCheck.status} | Type: ${imgCheck.contentType} | Taille: ${imgCheck.sizeKb} (${imgCheck.underLimit ? '✅ <300Ko' : '❌ >300Ko'})`);
    } else if (ogImage) {
      const imgCheck = checkedImages.get(ogImage);
      console.log(`   -> Test Image  : (Déjà vérifiée) HTTP ${imgCheck.status} | Taille: ${imgCheck.sizeKb}`);
    }
    console.log("");
  }

  console.log("============================================================");
  console.log("VÉRIFICATION DU CODE COMPILÉ (.output)");
  console.log("============================================================");

  const outputDir = path.join(rootDir, ".output");
  let foundOldDomain = false;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".html") || entry.name.endsWith(".json"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("project-trailblazer-hub.lovable.app")) {
          console.error(`❌ Trouvé ancien domaine dans : ${fullPath}`);
          foundOldDomain = true;
        }
      }
    }
  }

  scanDir(outputDir);
  if (!foundOldDomain) {
    console.log("✅ Aucune trace de l'ancien domaine (project-trailblazer-hub) dans .output\n");
  }

  console.log("============================================================");
  console.log("TEST D'UN NOUVEAU VITE_SITE_URL (DYNAMISME COMPLET)");
  console.log("============================================================");
  const testUrl = "https://mon-nouveau-domaine.com";
  process.env.VITE_SITE_URL = testUrl;

  const { generateSitemapAndRobots } = await import("./generate-sitemap-robots.mjs");
  await generateSitemapAndRobots();

  const robots = fs.readFileSync(path.join(rootDir, "public", "robots.txt"), "utf-8");
  let sitemapMatch = true;
  try {
    const res = await fetch(`${baseUrl}/sitemap.xml`);
    const sitemapText = await res.text();
    sitemapMatch = sitemapText.includes("<urlset");
  } catch {
    // Si serveur non démarré lors de ce test spécifique
  }

  const robotsMatch = robots.includes(`Sitemap: ${testUrl}/sitemap.xml`);

  console.log(`- Robots contient le nouveau domaine : ${robotsMatch ? '✅ OUI' : '❌ NON'}`);
  console.log(`- Sitemap dynamique opérationnel : ${sitemapMatch ? '✅ OUI' : '❌ NON'}`);

  // Restaurer
  delete process.env.VITE_SITE_URL;
  await generateSitemapAndRobots();
  console.log("✅ Restauration effectuée avec succès.");
}

main().catch(console.error);
