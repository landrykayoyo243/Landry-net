import crypto from "crypto";
import fs from "fs";
import postgres from "postgres";

// Parse .env
const env = fs.readFileSync(".env", "utf-8");
function getEnv(key) {
  const match = env.match(new RegExp(`^${key}="?([^"\\r\\n]+)"?`, "m"));
  return match ? match[1].trim() : "";
}

const cloudName = getEnv("CLOUDINARY_CLOUD_NAME") || "hdprt0zu";
const apiKey = getEnv("CLOUDINARY_API_KEY") || "244459676872437";
const apiSecret = getEnv("CLOUDINARY_API_SECRET") || "nXCA4KNLdF8SMoOJzb5axnKpJ1I";
const dbUrl = getEnv("LOVABLE_DB_MIGRATION_URL");

if (!dbUrl || !cloudName || !apiKey || !apiSecret) {
  console.error("Missing configuration");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require", max: 1 });

async function uploadUrlToCloudinary(url, folder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

  const fd = new FormData();
  fd.append("file", url);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to upload: ${res.statusText}`);
  }
  return data.secure_url;
}

async function migrate() {
  console.log("=== Début de la migration des médias vers Cloudinary (" + cloudName + ") ===\n");

  // 1. Projects
  console.log("1. Migration des projets...");
  const projects = await sql`SELECT id, slug, title, image_url FROM projects`;
  for (const p of projects) {
    if (p.image_url && p.image_url.includes("xrml8uik")) {
      console.log(`- Uploading image for project [${p.slug}]...`);
      try {
        const newUrl = await uploadUrlToCloudinary(p.image_url, "Landry_Media/projets");
        await sql`UPDATE projects SET image_url = ${newUrl} WHERE id = ${p.id}`;
        console.log(`  ✅ Ancien : ${p.image_url}\n     Nouveau : ${newUrl}`);
      } catch (err) {
        console.error(`  ❌ Erreur pour ${p.slug}:`, err.message);
      }
    } else {
      console.log(`- Projet [${p.slug}] déjà migré ou pas de xrml8uik`);
    }
  }

  // 2. App Settings: partner_brands
  console.log("\n2. Migration de partner_brands...");
  const brandsRow = await sql`SELECT value FROM app_settings WHERE key = 'partner_brands'`;
  if (brandsRow.length > 0 && Array.isArray(brandsRow[0].value)) {
    const brands = brandsRow[0].value;
    let changed = false;
    for (const b of brands) {
      if (b.logo_url && b.logo_url.includes("xrml8uik")) {
        console.log(`- Uploading logo for brand [${b.name}]...`);
        try {
          const newUrl = await uploadUrlToCloudinary(b.logo_url, "Landry_Media/organisations");
          b.logo_url = newUrl;
          changed = true;
          console.log(`  ✅ Nouveau logo pour ${b.name}: ${newUrl}`);
        } catch (err) {
          console.error(`  ❌ Erreur logo ${b.name}:`, err.message);
        }
      }
    }
    if (changed) {
      await sql`UPDATE app_settings SET value = ${sql.json(brands)}, updated_at = NOW() WHERE key = 'partner_brands'`;
      console.log("  ✅ Table app_settings (partner_brands) mise à jour avec succès !");
    }
  }

  // 3. App Settings: gallery_immersion
  console.log("\n3. Migration de gallery_immersion...");
  const galleryRow = await sql`SELECT value FROM app_settings WHERE key = 'gallery_immersion'`;
  if (galleryRow.length > 0 && Array.isArray(galleryRow[0].value)) {
    const items = galleryRow[0].value;
    let changed = false;
    for (const item of items) {
      if (item.image_url && item.image_url.includes("xrml8uik")) {
        console.log(`- Uploading image for immersion [${item.title}]...`);
        try {
          const newUrl = await uploadUrlToCloudinary(item.image_url, "Landry_Media/immersion");
          item.image_url = newUrl;
          changed = true;
          console.log(`  ✅ Nouvelle image immersion pour ${item.title}: ${newUrl}`);
        } catch (err) {
          console.error(`  ❌ Erreur immersion ${item.title}:`, err.message);
        }
      }
    }
    if (changed) {
      await sql`UPDATE app_settings SET value = ${sql.json(items)}, updated_at = NOW() WHERE key = 'gallery_immersion'`;
      console.log("  ✅ Table app_settings (gallery_immersion) mise à jour avec succès !");
    }
  }

  console.log("\n=== Migration des médias terminée avec succès ! ===");
  await sql.end();
}

migrate().catch(console.error);
