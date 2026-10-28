/**
 * Migration Phase C – Tables pour les Skills IA
 * Exécute uniquement les CREATE TABLE IF NOT EXISTS => idempotent.
 */
import postgres from "postgres";
import fs from "fs";

const raw = fs.readFileSync(".env", "utf-8");
let dbUrl = "";
for (const line of raw.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m && m[1].trim() === "LOVABLE_DB_MIGRATION_URL") {
    dbUrl = m[2].trim().replace(/^["']|["']$/g, "");
    break;
  }
}

if (!dbUrl) {
  console.error("❌  LOVABLE_DB_MIGRATION_URL introuvable dans .env");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require" });

async function run() {
  console.log("🔄  Migration Phase C – Skills IA");

  await sql`
    CREATE TABLE IF NOT EXISTS public.ai_skills (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      content text NOT NULL,
      is_system boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log("  ✅  Table ai_skills OK");

  await sql`
    CREATE TABLE IF NOT EXISTS public.ai_skill_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      skill_id uuid REFERENCES public.ai_skills(id) ON DELETE CASCADE NOT NULL,
      version integer NOT NULL,
      title text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
    )
  `;
  console.log("  ✅  Table ai_skill_versions OK");

  // Permissions service_role
  await sql`GRANT ALL ON public.ai_skills TO service_role`;
  await sql`GRANT SELECT ON public.ai_skills TO authenticated`;
  await sql`REVOKE INSERT, UPDATE, DELETE ON public.ai_skills FROM anon, authenticated`;
  await sql`ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY`;

  await sql`GRANT ALL ON public.ai_skill_versions TO service_role`;
  await sql`GRANT SELECT ON public.ai_skill_versions TO authenticated`;
  await sql`REVOKE INSERT, UPDATE, DELETE ON public.ai_skill_versions FROM anon, authenticated`;
  await sql`ALTER TABLE public.ai_skill_versions ENABLE ROW LEVEL SECURITY`;

  // Policies RLS
  await sql`DROP POLICY IF EXISTS "Admins read ai_skills" ON public.ai_skills`;
  await sql`
    CREATE POLICY "Admins read ai_skills" ON public.ai_skills FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
  `;

  await sql`DROP POLICY IF EXISTS "Admins read ai_skill_versions" ON public.ai_skill_versions`;
  await sql`
    CREATE POLICY "Admins read ai_skill_versions" ON public.ai_skill_versions FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
  `;

  console.log("  ✅  RLS + permissions OK");

  // Skill système par défaut (assistant portfolio)
  const existing = await sql`SELECT id FROM public.ai_skills WHERE slug = 'assistant-portfolio'`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO public.ai_skills (slug, title, description, content, is_system, is_active, version)
      VALUES (
        'assistant-portfolio',
        'Assistant Portfolio',
        'Skill système verrouillé – répond aux questions sur le portfolio de Landry Kayoyo.',
        ${'Tu es un assistant IA professionnel intégré au portfolio de Landry Kayoyo, développeur web basé en RDC.\n\n' +
          'Règles impératives :\n' +
          '- Réponds toujours en français, de manière claire, professionnelle et concise.\n' +
          '- Ne révèle jamais de clés API, mots de passe, informations confidentielles ou données personnelles.\n' +
          '- Ne génère pas de contenu offensant, illégal ou contraire à l\'éthique.\n' +
          '- Si tu n\'es pas sûr d\'une information, dis-le clairement plutôt que d\'inventer.\n' +
          '- Reste centré sur le portfolio, les projets, les compétences et les services de Landry.\n'},
        true,
        true,
        1
      )
    `;
    console.log("  ✅  Skill système 'assistant-portfolio' inséré");
  } else {
    console.log("  ℹ️   Skill système 'assistant-portfolio' déjà présent");
  }

  await sql.end();
  console.log("\n✅  Migration Phase C terminée avec succès !");
}

run().catch((err) => {
  console.error("❌  Erreur migration :", err.message);
  process.exit(1);
});
