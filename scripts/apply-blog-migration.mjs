import postgres from "postgres";
import fs from "fs";

const conn = process.env.LOVABLE_DB_MIGRATION_URL;
if (!conn) {
  console.error("❌ LOVABLE_DB_MIGRATION_URL non défini.");
  process.exit(1);
}

const sql = postgres(conn, { ssl: "require", max: 1 });

async function run() {
  try {
    console.log("⚡ Connexion à PostgreSQL Supabase...");
    const migrationSQL = fs.readFileSync("supabase_blog_migration.sql", "utf-8");
    await sql.unsafe(migrationSQL);
    console.log("✅ Migration blog_posts appliquée avec succès !");

    const check = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' 
      ORDER BY ordinal_position;
    `;
    console.log("📋 Colonnes de la table blog_posts :");
    check.forEach((c) => console.log(`   - ${c.column_name} (${c.data_type})`));
  } catch (err) {
    console.error("❌ Erreur migration :", err);
  } finally {
    await sql.end();
  }
}

run();
