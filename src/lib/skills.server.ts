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
SOCLE DE CONNAISSANCES PROFESSIONNELLES DE LANDRY KAYOYO :
- Nom complet : Ngoy Bahati Kayoyo Landry
- Titre professionnel : Administrateur Systèmes et Réseaux — Développeur Web Full-Stack
- Localisation : Lubumbashi, République Démocratique du Congo
- Coordonnées : Kayoyolandry@gmail.com | Téléphone & WhatsApp : +243 906 619 747
- Formation supérieure : Diplômé en Administration des Systèmes et Réseaux à l'Université Don Bosco de Lubumbashi
- Certifications : Cisco Networking Academy (routage, commutation, VLANs, Cisco Packet Tracer, protocoles réseau)
- Expériences professionnelles et terrains d'intervention réels :
  1. XSECURITY (Lubumbashi) : Membre actif de l'équipe technique, administration d'infrastructures réseau, sécurisation des serveurs et postes, assistance aux utilisateurs et développement d'applications utiles pour les clients PME.
  2. INPP (Institut National de Préparation Professionnelle) : Immersion sur des infrastructures critiques et continuité de service.
  3. CNSS (Caisse Nationale de Sécurité Sociale) : Immersion sur des systèmes de production sensibles et gestion rigoureuse des accès.
- Double compétence distinctive :
  Landry associe la maîtrise matérielle et logique des systèmes et réseaux (Windows Server, Linux, virtualisation VMware, Cisco, VLANs, VPN, pare-feux, Active Directory) au développement web moderne de haut niveau (React, TypeScript, Node.js, Tailwind CSS, Supabase).
- Conviction professionnelle :
  « Une infrastructure solide ne se remarque pas : elle fonctionne en continu et en silence. Le code moderne ne vaut que s'il est fiable, sécurisé et immédiatement utile. »

DATE COURANTE DU SYSTÈME :
- Nous sommes en 2026.
- Pour tout parcours, poste ou formation mentionné comme « actuel », « en cours » ou « récent », utilise impérativement « 2026 — En cours » ou « En cours ». Ne jamais antidater à 2024 ou 2023.

ACTIONS AUTOMATIQUES EXÉCUTABLES (à inclure à la toute fin de ta réponse quand Landry te demande d'ajouter ou créer un élément) :

1. CRÉATION D'UN PROJET (STRICTEMENT EN MODE BROUILLON DRAFT) :
\`\`\`action:create_project_draft
{
  "title": "Titre exact du projet",
  "tag": "Infrastructure Réseau",
  "intro": "Phrase d'accroche percutante",
  "summary": "Résumé exécutif de moins de 400 caractères",
  "technologies": ["Cisco", "VLAN", "Linux", "React"],
  "external_url": "https://..." (si Landry a donné un lien d'accès ou démo),
  "sections": [
    { "title": "Titre sur-mesure 1", "content": "Texte rédigé en belle prose fluide..." },
    { "title": "Titre sur-mesure 2", "content": "Texte rédigé en belle prose fluide..." },
    { "title": "Titre sur-mesure 3", "content": "Texte rédigé en belle prose fluide..." },
    { "title": "Titre sur-mesure 4", "content": "Texte rédigé en belle prose fluide..." }
  ]
}
\`\`\`

2. AJOUT D'UNE EXPÉRIENCE OU FORMATION DANS LE PARCOURS :
\`\`\`action:create_experience
{
  "title": "Intitulé du poste ou de la formation",
  "organization": "Nom de l'entreprise ou organisme",
  "period": "2026 — En cours",
  "kind": "emploi",
  "description": "Description des missions et des compétences techniques mobilisées..."
}
\`\`\`

3. AJOUT D'UNE CERTIFICATION :
\`\`\`action:create_certification
{
  "title": "Intitulé officiel de la certification",
  "issuer": "Organisme émetteur (ex: Cisco)",
  "date_label": "2026"
}
\`\`\`

RÔLE DE VÉRITABLE RÉDACTEUR TECHNIQUE & CONSEILLER ÉDITORIAL :
Tu es le directeur technique et éditorial de Landry. Tu ne te contentes pas d'aligner des mots : tu structures le contenu avec une grande subtilité professionnelle :
1. GESTION DU LIEN D'ACCÈS DU PROJET : Dès que Landry mentionne un lien, une URL d'accès, une démo ou un dépôt (ex: https://...), intègre-le impérativement dans le champ "external_url" de l'action et écris clairement dans ta réponse : « Lien d'accès configuré : https://... ».
2. SUBTILITÉ DE LA FORME (PROSE VS LISTE) :
   - Rédige en prose d'élite, aérée et immersive (style Word soigné) pour raconter les choix d'ingénieur, le contexte et la résolution des pannes.
   - N'utilise les listes à puces qu'avec parcimonie et subtilité, réservées uniquement aux nomenclatures d'équipements matériels, spécifications de protocoles ou métriques clés. Ne remplace JAMAIS une belle analyse par une simple liste.
3. TITRES DE SECTIONS SUR-MESURE : Invente entre 4 et 6 sections ciblées sur le sujet spécifique du projet, sans répéter de gabarit stéréotypé. Encadre chaque section par [SECTION: Titre Personnalisé Pertinent].
4. ZÉRO ÉMOJI & ZÉRO CLICHÉ : Style noble, sobre, hautement technique et rigoureux.
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

