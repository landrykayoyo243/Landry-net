import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

export interface AiSkill {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  is_system: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AiSkillVersion {
  id: string;
  skill_id: string;
  version: number;
  title: string;
  content: string;
  created_at: string;
}

/** Liste tous les skills (actifs ou non) */
export async function listSkills(): Promise<AiSkill[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_skills")
    .select("*")
    .order("is_system", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Impossible de charger les skills IA.");
  return (data ?? []) as AiSkill[];
}

/** Récupère un skill par son slug */
export async function getSkillBySlug(slug: string): Promise<AiSkill | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_skills")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error("Impossible de charger le skill.");
  return data as AiSkill | null;
}

/** Crée un nouveau skill */
export async function createSkill(
  input: { slug: string; title: string; description: string; content: string },
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<AiSkill> {
  // Validation slug
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!slug || !input.title.trim() || !input.content.trim()) {
    throw new Error("Le slug, le titre et le contenu sont requis.");
  }

  const { data, error } = await supabaseAdmin
    .from("ai_skills")
    .insert({
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      content: input.content.trim(),
      is_system: false,
      is_active: true,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Un skill avec le slug « ${slug} » existe déjà.`);
    }
    throw new Error("Impossible de créer le skill.");
  }

  const skill = data as AiSkill;

  // Sauvegarder la première version dans l'historique
  await supabaseAdmin.from("ai_skill_versions").insert({
    skill_id: skill.id,
    version: 1,
    title: skill.title,
    content: skill.content,
    created_by: context?.userId ?? null,
  });

  await logAudit({
    action: "skill.create",
    target: slug,
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: { title: skill.title },
    requestHeaders: context?.headers,
  });

  return skill;
}

/** Met à jour un skill existant (pas les skills système) */
export async function updateSkill(
  id: string,
  input: { title?: string; description?: string; content?: string; is_active?: boolean },
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<AiSkill> {
  // Vérifier que le skill existe et n'est pas système
  const { data: existing } = await supabaseAdmin
    .from("ai_skills")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) throw new Error("Skill introuvable.");

  const skill = existing as AiSkill;

  // Les skills système peuvent être activés/désactivés mais pas modifiés dans leur contenu
  const contentChanged =
    (input.title !== undefined && input.title.trim() !== skill.title) ||
    (input.content !== undefined && input.content.trim() !== skill.content);

  if (skill.is_system && contentChanged) {
    throw new Error("Le contenu d'un skill système ne peut pas être modifié (règle de base verrouillée).");
  }

  const newVersion = contentChanged ? skill.version + 1 : skill.version;

  const updates: Partial<AiSkill> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
    version: newVersion,
  };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.content !== undefined) updates.content = input.content.trim();
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await supabaseAdmin
    .from("ai_skills")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error("Impossible de mettre à jour le skill.");

  const updated = data as AiSkill;

  // Si le contenu a changé, enregistrer une nouvelle version dans l'historique
  if (contentChanged) {
    await supabaseAdmin.from("ai_skill_versions").insert({
      skill_id: id,
      version: newVersion,
      title: updated.title,
      content: updated.content,
      created_by: context?.userId ?? null,
    });
  }

  await logAudit({
    action: "skill.update",
    target: skill.slug,
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: { version: newVersion, content_changed: contentChanged },
    requestHeaders: context?.headers,
  });

  return updated;
}

/** Supprime un skill (impossible pour les skills système) */
export async function deleteSkill(
  id: string,
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from("ai_skills")
    .select("slug, title, is_system")
    .eq("id", id)
    .maybeSingle();

  if (!existing) throw new Error("Skill introuvable.");
  if ((existing as AiSkill).is_system) {
    throw new Error("Les skills système ne peuvent pas être supprimés.");
  }

  const { error } = await supabaseAdmin.from("ai_skills").delete().eq("id", id);
  if (error) throw new Error("Impossible de supprimer le skill.");

  await logAudit({
    action: "skill.delete",
    target: (existing as AiSkill).slug,
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: { title: (existing as AiSkill).title },
    requestHeaders: context?.headers,
  });
}

/** Récupère l'historique des versions d'un skill */
export async function getSkillVersions(skillId: string): Promise<AiSkillVersion[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_skill_versions")
    .select("*")
    .eq("skill_id", skillId)
    .order("version", { ascending: false });

  if (error) throw new Error("Impossible de charger l'historique du skill.");
  return (data ?? []) as AiSkillVersion[];
}

const CONNAISSANCE_PORTFOLIO_LANDRY = `
BASE DE CONNAISSANCES CENTRALE DU PORTFOLIO DE LANDRY KAYOYO :
- Nom complet : Ngoy Bahati Kayoyo Landry
- Titre professionnel : Administrateur Systèmes et Réseaux — Développeur Web Full-Stack
- Localisation : Lubumbashi, République Démocratique du Congo
- Coordonnées : Kayoyolandry@gmail.com | Téléphone & WhatsApp : +243 906 619 747
- Formation supérieure : Diplômé en Administration des Systèmes et Réseaux à l'Université Don Bosco de Lubumbashi
- Certifications : Cisco Networking Academy (routage, commutation, VLANs, Cisco Packet Tracer, protocoles réseau)
- Expériences professionnelles et terrains d'intervention :
  1. XSECURITY (Lubumbashi) : Membre actif de l'équipe technique, administration d'infrastructures réseau, sécurisation des serveurs et postes, assistance aux utilisateurs et développement d'applications web utiles pour les clients PME.
  2. INPP (Institut National de Préparation Professionnelle) : Immersion sur des infrastructures critiques et continuité de service.
  3. CNSS (Caisse Nationale de Sécurité Sociale) : Immersion sur des systèmes de production sensibles et gestion rigoureuse des accès.
  4. PayLix : Conception et développement d'une plateforme web Fintech Full-Stack.
- Atout concurrentiel distinctif :
  Landry combine la maîtrise matérielle et logicielle des systèmes et réseaux (Windows Server, Linux, virtualisation VMware, Cisco, VLANs, VPN, pare-feux) avec le développement web moderne de haut niveau (React, TypeScript, Node.js, Tailwind CSS, Supabase, intégration IA Gemini).
- Conviction professionnelle :
  « Une infrastructure solide ne se remarque pas : elle fonctionne en continu et en silence. Le code moderne ne vaut que s'il est fiable, sécurisé et immédiatement utile. »

RÈGLES DE FORME OBLIGATOIRES POUR TOUTES TES RÉPONSES :
1. N'utilise JAMAIS d'émojis ou d'émoticônes. Le style doit être strictement sobre, professionnel et élégant.
2. N'utilise JAMAIS de symboles markdown bruts encombrants comme des séries de ### ou de ** inutiles qui polluent le texte. Rédige en prose fluide, limpide et propre, prête à être lue ou insérée dans un document de type Word.
3. Pour les projets générés, respecte impérativement le mode brouillon (draft) afin que Landry valide et mette en forme dans l'éditeur de texte avant toute diffusion publique.
`;

/**
 * Construit le system instruction complet en combinant le socle de connaissances
 * du portfolio et tous les skills actifs.
 * Les skills système sont toujours inclus en premier.
 */
export async function buildSystemInstruction(slugs?: string[]): Promise<string> {
  const { data } = await supabaseAdmin
    .from("ai_skills")
    .select("slug, content, is_system")
    .eq("is_active", true)
    .order("is_system", { ascending: false });

  const skills = (data ?? []) as Pick<AiSkill, "slug" | "content" | "is_system">[];

  // Si slugs fournis, filtrer (mais toujours inclure les skills système)
  const filtered = slugs
    ? skills.filter((s) => s.is_system || slugs.includes(s.slug))
    : skills;

  const skillsContent = filtered.map((s) => s.content.trim()).filter(Boolean).join("\n\n---\n\n");

  return [CONNAISSANCE_PORTFOLIO_LANDRY.trim(), skillsContent].filter(Boolean).join("\n\n---\n\n");
}

