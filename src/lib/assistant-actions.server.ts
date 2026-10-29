import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";
import {
  newId,
  slugify,
  starterTemplate,
  type Block,
  type HeadingBlock,
  type ParagraphBlock,
  type RichDoc,
  type RichNode,
} from "./blocks";

/** Convertit un texte brut multi-paragraphes en RichDoc TipTap */
export function stringToRichDoc(text: string): RichDoc {
  if (!text || !text.trim()) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  // Découper par doubles sauts de ligne pour les paragraphes
  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const nodes: RichNode[] = rawParagraphs.map((para) => {
    // Si la ligne commence par une puce
    const clean = para.replace(/^[-*•]\s+/, "");
    return {
      type: "paragraph",
      content: clean ? [{ type: "text", text: clean }] : undefined,
    };
  });

  return {
    type: "doc",
    content: nodes,
  };
}

/** Convertit des sections [SECTION: ...] en blocs pour l'éditeur de projet */
export function sectionsToBlocks(
  sections: Array<{ title: string; content: string }>,
): Block[] {
  if (!sections || sections.length === 0) {
    return starterTemplate();
  }

  const blocks: Block[] = [];

  for (const s of sections) {
    const title = s.title.trim();
    const content = s.content.trim();

    if (title) {
      const heading: HeadingBlock = {
        id: newId(),
        type: "heading",
        text: title,
        layout: "full",
        tone: title.toLowerCase().includes("résultat") ? "plain" : "plain",
        variant: title.toLowerCase().includes("résultat") ? "result" : "default",
      };
      blocks.push(heading);
    }

    if (content) {
      const isIllustration =
        title.toLowerCase().includes("illustration") ||
        title.toLowerCase().includes("visuel") ||
        title.toLowerCase().includes("capture");

      if (isIllustration) {
        // Ajouter un bloc paragraphe avec note explicative
        const para: ParagraphBlock = {
          id: newId(),
          type: "paragraph",
          doc: stringToRichDoc(`Recommandation visuelle : ${content}`),
        };
        blocks.push(para);
      } else {
        const para: ParagraphBlock = {
          id: newId(),
          type: "paragraph",
          doc: stringToRichDoc(content),
        };
        blocks.push(para);
      }
    }
  }

  return blocks;
}

export interface ProjectDraftInput {
  title: string;
  slug?: string;
  tag?: string;
  intro?: string;
  summary?: string;
  technologies?: string[];
  external_url?: string;
  sections?: Array<{ title: string; content: string }>;
}

export interface ExperienceInput {
  title: string;
  organization: string;
  period: string;
  kind?: "emploi" | "stage" | "formation" | string;
  description: string;
}

export interface CertificationInput {
  title: string;
  issuer: string;
  date_label: string;
}

export interface ActionResult {
  success: boolean;
  type: "create_project_draft" | "create_experience" | "create_certification";
  entity: "project" | "experience" | "certification";
  id: string;
  title: string;
  slug?: string;
  status: "draft" | "published";
  editUrl?: string;
}

/** Génère un slug unique en base */
async function makeUniqueProjectSlug(baseTitle: string, existingSlug?: string): Promise<string> {
  const initial = slugify(existingSlug || baseTitle) || "projet-" + Math.random().toString(36).slice(2, 6);
  let candidate = initial;
  let counter = 1;

  while (true) {
    const { data } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
    counter++;
    candidate = `${initial}-${counter}`;
  }
}

/** Récupère le prochain numéro d'ordre pour l'affichage */
async function getNextSortOrder(table: "projects" | "experiences" | "certifications"): Promise<number> {
  const { data } = await supabaseAdmin
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  return (data?.[0]?.sort_order ?? -1) + 1;
}

/**
 * RÈGLE D'OR : Pour un projet, l'enregistrement se fait TOUJOURS en mode BROUILLON ('draft').
 * L'assistant IA ne doit jamais publier directement un projet afin que Landry puisse
 * le relire et ajuster la mise en page dans l'éditeur de texte riche (type Word).
 */
export async function executeCreateProjectDraft(
  input: ProjectDraftInput,
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<ActionResult> {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Le titre du projet est requis pour l'enregistrer en brouillon.");
  }

  const slug = await makeUniqueProjectSlug(title, input.slug);
  const nextOrder = await getNextSortOrder("projects");
  const blocks = sectionsToBlocks(input.sections ?? []);

  const payload = {
    title,
    slug,
    tag: input.tag?.trim() || "Full-Stack",
    intro: input.intro?.trim() || "",
    summary: (input.summary?.trim() || "").slice(0, 500),
    technologies: Array.isArray(input.technologies) ? input.technologies : [],
    external_url: input.external_url?.trim() || null,
    featured: false,
    status: "draft" as const, // STRICTEMENT BROUILLON
    content: blocks as never,
    sort_order: nextOrder,
  };

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert(payload)
    .select("id, title, slug, status")
    .single();

  if (error || !data) {
    console.error("[executeCreateProjectDraft]", error);
    throw new Error("Impossible d'enregistrer le projet en brouillon.");
  }

  await logAudit({
    action: "project.create_draft_ai",
    target: slug,
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: {
      id: data.id,
      title: data.title,
      slug: data.slug,
      status: "draft",
      technologies: payload.technologies,
    },
    requestHeaders: context?.headers,
  });

  return {
    success: true,
    type: "create_project_draft",
    entity: "project",
    id: data.id,
    title: data.title,
    slug: data.slug,
    status: "draft",
    editUrl: `/admin/projets/${data.id}`,
  };
}

/** Création d'une expérience (publication directe autorisée) */
export async function executeCreateExperience(
  input: ExperienceInput,
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<ActionResult> {
  const title = input.title?.trim();
  const org = input.organization?.trim();
  if (!title || !org) {
    throw new Error("Le titre et l'organisation sont requis pour l'expérience.");
  }

  const nextOrder = await getNextSortOrder("experiences");

  const { data, error } = await supabaseAdmin
    .from("experiences")
    .insert({
      title,
      organization: org,
      period: input.period?.trim() || "En cours",
      kind:
        input.kind === "formation"
          ? "formation"
          : input.kind === "stage"
          ? "stage"
          : "emploi",
      description: input.description?.trim() || "",
      published: true, // Publication directe autorisée pour le parcours
      sort_order: nextOrder,
    })
    .select("id, title, published")
    .single();

  if (error || !data) {
    console.error("[executeCreateExperience]", error);
    throw new Error("Impossible de créer l'expérience.");
  }

  await logAudit({
    action: "experience.create_ai",
    target: title,
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: { id: data.id, title, published: true },
    requestHeaders: context?.headers,
  });

  return {
    success: true,
    type: "create_experience",
    entity: "experience",
    id: data.id,
    title: data.title,
    status: "published",
    editUrl: "/admin/parcours",
  };
}

/** Création d'une certification (publication directe autorisée) */
export async function executeCreateCertification(
  input: CertificationInput,
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<ActionResult> {
  const title = input.title?.trim();
  const issuer = input.issuer?.trim();
  if (!title || !issuer) {
    throw new Error("Le titre et l'organisme émetteur sont requis pour la certification.");
  }

  const nextOrder = await getNextSortOrder("certifications");

  const { data, error } = await supabaseAdmin
    .from("certifications")
    .insert({
      title,
      issuer,
      date_label: input.date_label?.trim() || new Date().getFullYear().toString(),
      published: true, // Publication directe autorisée pour les certifications
      sort_order: nextOrder,
    })
    .select("id, title, published")
    .single();

  if (error || !data) {
    console.error("[executeCreateCertification]", error);
    throw new Error("Impossible de créer la certification.");
  }

  await logAudit({
    action: "certification.create_ai",
    target: title,
    result: "success",
    userId: context?.userId,
    userEmail: context?.userEmail,
    details: { id: data.id, title, published: true },
    requestHeaders: context?.headers,
  });

  return {
    success: true,
    type: "create_certification",
    entity: "certification",
    id: data.id,
    title: data.title,
    status: "published",
    editUrl: "/admin/certifications",
  };
}

/**
 * Détecte et extrait un bloc d'action dans la réponse de l'IA
 * Format supporté :
 * ```action:create_project_draft
 * { ...json }
 * ```
 */
export async function processAiActionBlock(
  text: string,
  context?: { userId?: string; userEmail?: string; headers?: Headers },
): Promise<{ cleanedText: string; actionExecuted?: ActionResult }> {
  const regex = /```action:(create_project_draft|create_experience|create_certification)\s*([\s\S]*?)```/i;
  const match = regex.exec(text);

  if (!match) {
    return { cleanedText: text };
  }

  const actionType = match[1].toLowerCase();
  const jsonContent = match[2].trim();
  const cleanedText = text.replace(match[0], "").trim();

  try {
    const parsed = JSON.parse(jsonContent);

    if (actionType === "create_project_draft") {
      const result = await executeCreateProjectDraft(parsed, context);
      return { cleanedText, actionExecuted: result };
    }

    if (actionType === "create_experience") {
      const result = await executeCreateExperience(parsed, context);
      return { cleanedText, actionExecuted: result };
    }

    if (actionType === "create_certification") {
      const result = await executeCreateCertification(parsed, context);
      return { cleanedText, actionExecuted: result };
    }
  } catch (err) {
    console.warn("[processAiActionBlock] Échec de l'exécution de l'action IA :", err);
  }

  return { cleanedText };
}
