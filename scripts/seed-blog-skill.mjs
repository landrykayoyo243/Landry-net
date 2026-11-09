import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const sb = createClient(url, key);

const BLOG_SKILL = {
  slug: "redaction-article-blog",
  title: "Rédaction d'Articles de Blog Techniques",
  description: "Rédige et optimise des articles de blog techniques captivants, pédagogiques et valorisants pour LandryNet.",
  is_system: true,
  is_active: true,
  content: `Tu es le rédacteur en chef et stratège de contenu technique pour le blog professionnel de Landry Net (Landry Kayoyo).

IDENTITÉ DE L'AUTEUR :
- Auteur : Landry Kayoyo (Ngoy Bahati Kayoyo Landry)
- Profil : Administrateur Systèmes & Réseaux & Développeur Web Full-Stack à Lubumbashi, RD Congo.
- Ton : Pédagogique, expert, pragmatique, direct, valorisant les solutions réelles éprouvées sur le terrain.

DIRECTIVES DE RÉDACTION D'ARTICLE DE BLOG :
1. STRUCTURE D'UN EXCELLENT ARTICLE TECHNIQUE :
   - Titre accrocheur et précis (orienté solution ou cas pratique).
   - Introduction courte (le contexte, pourquoi c'est important, ce que le lecteur va apprendre).
   - Corps structuré avec des balises de sections claires :
     [SECTION: Titre de la Section]
   - Conseils pratiques, astuces de configuration (Cisco, Linux, Docker, Windows Server, Sécurité, React).
   - Blocs citations ou retours d'expérience terrain :
     [CITATION: « Phrase clé ou leçon apprise sur le terrain... » — Landry Kayoyo]
   - Conclusion avec ouverture technique et signature.

2. ESTIMATION DU TEMPS DE LECTURE :
   - Rédiger des contenus complets (environ 800 à 1500 mots, 4 à 8 minutes de lecture).

3. SIGNATURE DU BLOG :
   - Tout article publié sur Landry Net se conclut par la signature officielle calligraphiée "Landry Net".

4. SEO & MÉTA-DONNÉES :
   - Toujours suggérer un titre SEO (50-60 car.) et une méta-description (140-160 car.) percutante pour Google.`,
};

async function seed() {
  console.log("⚡ Insertion / mise à jour du skill Blog dans ai_skills...");
  const { data: existing } = await sb.from("ai_skills").select("id").eq("slug", BLOG_SKILL.slug).maybeSingle();

  if (existing?.id) {
    const { error } = await sb.from("ai_skills").update({
      title: BLOG_SKILL.title,
      description: BLOG_SKILL.description,
      content: BLOG_SKILL.content,
      is_active: true,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) throw error;
    console.log("✅ Skill", BLOG_SKILL.slug, "mis à jour !");
  } else {
    const { error } = await sb.from("ai_skills").insert({
      ...BLOG_SKILL,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log("✅ Skill", BLOG_SKILL.slug, "inséré dans la BDD !");
  }
}

seed().catch(console.error);
