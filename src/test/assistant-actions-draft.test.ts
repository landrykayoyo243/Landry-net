import { describe, it, expect, afterAll } from "vitest";
import {
  executeCreateProjectDraft,
  executeCreateExperience,
  executeCreateCertification,
  processAiActionBlock,
  stringToRichDoc,
  sectionsToBlocks,
} from "@/lib/assistant-actions.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

describe("Assistant IA - Publication & Mode Brouillon Projets", () => {
  const createdProjectIds: string[] = [];
  const createdExperienceIds: string[] = [];
  const createdCertificationIds: string[] = [];

  afterAll(async () => {
    // Nettoyage des données de test
    if (createdProjectIds.length > 0) {
      await supabaseAdmin.from("projects").delete().in("id", createdProjectIds);
    }
    if (createdExperienceIds.length > 0) {
      await supabaseAdmin.from("experiences").delete().in("id", createdExperienceIds);
    }
    if (createdCertificationIds.length > 0) {
      await supabaseAdmin.from("certifications").delete().in("id", createdCertificationIds);
    }
  });

  it("1. stringToRichDoc convertit le texte multi-paragraphes en document TipTap compatible Word", () => {
    const text = "Premier paragraphe important.\n\nDeuxième paragraphe avec plus de détails.";
    const doc = stringToRichDoc(text);

    expect(doc.type).toBe("doc");
    expect(doc.content).toBeDefined();
    expect(doc.content?.length).toBe(2);
    expect(doc.content?.[0].type).toBe("paragraph");
    expect(doc.content?.[0].content?.[0].text).toBe("Premier paragraphe important.");
  });

  it("2. sectionsToBlocks génère les blocs Heading et Paragraph TipTap", () => {
    const sections = [
      { title: "Contexte & Objectifs", content: "Mise en place d'une plateforme sécurisée." },
      { title: "Le Défi Technique", content: "Scalabilité et temps de réponse." },
    ];
    const blocks = sectionsToBlocks(sections);

    expect(blocks.length).toBe(4); // 2 titres + 2 paragraphes
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].text).toBe("Contexte & Objectifs");
    expect(blocks[1].type).toBe("paragraph");
    expect((blocks[1] as any).doc?.content?.[0]?.content?.[0]?.text).toBe(
      "Mise en place d'une plateforme sécurisée.",
    );
  });

  it("3. RÈGLE STRICTE : executeCreateProjectDraft force TOUJOURS le statut en 'draft' (brouillon)", async () => {
    const res = await executeCreateProjectDraft({
      title: "Test Projet IA Brouillon Strict",
      tag: "DevOps & Cloud",
      intro: "Accroche du projet de test.",
      summary: "Résumé court de test.",
      technologies: ["Docker", "Kubernetes", "TypeScript"],
      sections: [
        { title: "Contexte & Objectifs", content: "Problématique initiale..." },
        { title: "Résultats & Impact", content: "Gains de 50% de temps de déploiement." },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.entity).toBe("project");
    expect(res.status).toBe("draft"); // TOUJOURS BROUILLON !
    expect(res.editUrl).toContain(`/admin/projets/${res.id}`);
    createdProjectIds.push(res.id);

    // Vérification directe en base
    const { data: row } = await supabaseAdmin
      .from("projects")
      .select("status, content, technologies, slug")
      .eq("id", res.id)
      .single();

    expect(row).toBeDefined();
    expect(row?.status).toBe("draft");
    expect(row?.technologies).toContain("Docker");
    expect(Array.isArray(row?.content)).toBe(true);
  });

  it("4. executeCreateExperience permet la publication directe (published = true)", async () => {
    const res = await executeCreateExperience({
      title: "Architecte Cloud Freelance Test",
      organization: "Entreprise Test SA",
      period: "2024 - 2025",
      kind: "emploi",
    });

    expect(res.success).toBe(true);
    expect(res.entity).toBe("experience");
    expect(res.status).toBe("published");
    createdExperienceIds.push(res.id);

    // Vérification en base
    const { data: row } = await supabaseAdmin
      .from("experiences")
      .select("published, organization")
      .eq("id", res.id)
      .single();

    expect(row?.published).toBe(true);
    expect(row?.organization).toBe("Entreprise Test SA");
  });

  it("5. executeCreateCertification permet la publication directe (published = true)", async () => {
    const res = await executeCreateCertification({
      title: "Docker Certified Associate Test",
      issuer: "Docker Inc.",
      date_label: "2024",
    });

    expect(res.success).toBe(true);
    expect(res.entity).toBe("certification");
    expect(res.status).toBe("published");
    createdCertificationIds.push(res.id);

    // Vérification en base
    const { data: row } = await supabaseAdmin
      .from("certifications")
      .select("published, issuer")
      .eq("id", res.id)
      .single();

    expect(row?.published).toBe(true);
    expect(row?.issuer).toBe("Docker Inc.");
  });

  it("6. processAiActionBlock extrait le bloc action, enregistre le brouillon et nettoie le texte", async () => {
    const textWithAction = `Voici l'étude de cas demandée. Tout est rédigé de façon sobre et professionnelle.

\`\`\`action:create_project_draft
{
  "title": "Plateforme Fintech Sécurisée",
  "tag": "Fintech & API",
  "intro": "Système de réconciliation bancaire en temps réel.",
  "summary": "Automatisation complète des flux financiers.",
  "technologies": ["Go", "React", "PostgreSQL"],
  "sections": [
    { "title": "Contexte & Objectifs", "content": "Rapprochement bancaire manuel trop lent." },
    { "title": "Architecture & Choix Technologiques", "content": "Architecture événementielle robuste." }
  ]
}
\`\`\`

J'ai enregistré le projet en mode brouillon pour vous permettre d'ajuster la mise en page.`;

    const { cleanedText, actionExecuted } = await processAiActionBlock(textWithAction);

    expect(actionExecuted).toBeDefined();
    expect(actionExecuted?.type).toBe("create_project_draft");
    expect(actionExecuted?.status).toBe("draft");
    expect(actionExecuted?.title).toBe("Plateforme Fintech Sécurisée");
    if (actionExecuted?.id) {
      createdProjectIds.push(actionExecuted.id);
    }

    // Le texte renvoyé au chat ne doit plus contenir le bloc de code JSON brut
    expect(cleanedText).not.toContain("```action:create_project_draft");
    expect(cleanedText).toContain("Voici l'étude de cas demandée");
    expect(cleanedText).toContain("J'ai enregistré le projet en mode brouillon");
  });
});
