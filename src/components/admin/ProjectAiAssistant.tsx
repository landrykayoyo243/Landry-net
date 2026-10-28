import { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  Wand2,
  Lightbulb,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, type AiSkill } from "@/lib/admin-api-client";
import { createBlock, type Block } from "@/lib/blocks";

interface ProjectAiAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData: {
    title: string;
    tag: string;
    intro: string;
    summary: string;
    technologies: string[];
  };
  onApplySummary: (intro: string, summary: string) => void;
  onApplyTechnologies: (technologies: string[]) => void;
  onApplyCaseStudyBlocks: (blocks: Block[]) => void;
}

type AiMode = "case_study" | "summary" | "technologies" | "custom";

export function ProjectAiAssistant({
  open,
  onOpenChange,
  projectData,
  onApplySummary,
  onApplyTechnologies,
  onApplyCaseStudyBlocks,
}: ProjectAiAssistantProps) {
  const [mode, setMode] = useState<AiMode>("case_study");
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [parsedBlocks, setParsedBlocks] = useState<Block[] | null>(null);
  const [parsedTechs, setParsedTechs] = useState<string[] | null>(null);
  const [parsedIntro, setParsedIntro] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);
  const [skills, setSkills] = useState<AiSkill[]>([]);

  useEffect(() => {
    if (open) {
      adminApi
        .listSkills()
        .then((data) => setSkills(data.filter((s) => s.is_active)))
        .catch(() => {});
    }
  }, [open]);

  async function handleGenerate(targetMode: AiMode = mode) {
    if (!projectData.title.trim() && targetMode !== "custom") {
      toast.error("Veuillez d'abord renseigner le titre du projet.");
      return;
    }

    setLoading(true);
    setGeneratedText("");
    setParsedBlocks(null);
    setParsedTechs(null);
    setParsedIntro(null);
    setParsedSummary(null);

    try {
      const techList = projectData.technologies.join(", ") || "Non spécifiées";
      let systemInstruction = "";
      let prompt = "";

      if (targetMode === "case_study") {
        const caseSkill = skills.find((s) => s.slug === "redaction-etude-de-cas");
        systemInstruction =
          (caseSkill?.content || "Tu es un rédacteur tech et architecte logiciel.") +
          "\n\nRÈGLE STRICTE : N'utilise AUCUN émoji dans ta rédaction.";

        prompt = `Rédige une étude de cas détaillée et professionnelle pour le portfolio de Landry Kayoyo :
- Titre du projet : "${projectData.title}"
- Catégorie / Domaine : "${projectData.tag || "Full-Stack & DevOps"}"
- Technologies associées : ${techList}
- Contexte initial : "${projectData.intro || projectData.summary || ""}"

Structure obligatoire (SANS AUCUN ÉMOJI) :
[SECTION: Contexte & Objectifs]
(Explique le contexte et le besoin initial de façon claire et sans jargon excessif)

[SECTION: Le Défi Technique]
(Détaille la problématique, les contraintes et défis surmontés)

[SECTION: Architecture & Choix Technologiques]
(Détaille la stack technique et justifie les choix architecturaux)

[SECTION: Mon Rôle & Réalisations]
(Met en valeur les accomplissements concrets de Landry : conception, développement des composants clés, bonnes pratiques)

[SECTION: Suggestion d'Illustration]
(Conseille précisément un emplacement pour une capture d'écran ou un schéma que Landry ajoutera lui-même)

[SECTION: Résultats & Valeur Ajoutée]
(Gains de performance, métriques, impact réel et bénéfices concrets)`;
      } else if (targetMode === "summary") {
        prompt = `Pour le projet "${projectData.title}" (${techList}) :
RÈGLE STRICTE : AUCUN ÉMOJI.
Génère en français :
---INTRO---
(Une phrase d'accroche valorisante et claire pour la page du projet)
---SUMMARY---
(Un résumé percutant du problème et de la solution de moins de 400 caractères, idéal pour une carte de présentation)`;
      } else if (targetMode === "technologies") {
        prompt = `Projet : "${projectData.title}". Technologies : ${techList}.
Suggère 5 à 8 technologies ou outils modernes les plus pertinents et cohérents.
Réponds uniquement par la liste séparée par des virgules (ex: React, TypeScript, Docker, PostgreSQL). Sans aucun émoji.`;
      } else {
        prompt = `Projet : "${projectData.title}"
Technologies : ${techList}
RÈGLE STRICTE : AUCUN ÉMOJI.
Demande : ${customPrompt || "Améliore la présentation du projet"}`;
      }

      const res = await adminApi.generateAiText({
        prompt,
        systemInstruction: systemInstruction || undefined,
        temperature: 0.7,
      });

      const text = res.text.trim();
      setGeneratedText(text);

      if (targetMode === "summary") {
        const introMatch = text.match(/---INTRO---\s*([\s\S]*?)(?=---SUMMARY---|$)/i);
        const summaryMatch = text.match(/---SUMMARY---\s*([\s\S]*?)$/i);
        if (introMatch && summaryMatch) {
          setParsedIntro(introMatch[1].trim());
          setParsedSummary(summaryMatch[1].trim());
        } else {
          setParsedSummary(text.slice(0, 400));
        }
      } else if (targetMode === "technologies") {
        const list = text
          .split(/,|\n/)
          .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
          .filter((s) => s.length > 1 && s.length < 50);
        setParsedTechs(Array.from(new Set([...projectData.technologies, ...list])));
      } else if (targetMode === "case_study") {
        const sections: Block[] = [];
        const pattern = /\[SECTION:\s*([^\]]+)\]\s*([\s\S]*?)(?=\[SECTION:|$)/gi;
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const sectionTitle = match[1].trim();
          const sectionContent = match[2].trim();
          if (sectionTitle) {
            const heading = createBlock("heading");
            heading.text = sectionTitle;
            heading.level = 2;
            sections.push(heading);
          }
          if (sectionContent) {
            const paragraph = createBlock("paragraph");
            paragraph.text = sectionContent;
            sections.push(paragraph);
          }
        }
        if (sections.length > 0) {
          setParsedBlocks(sections);
        }
      }

      toast.success("Proposition IA générée avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération IA");
    } finally {
      setLoading(false);
    }
  }

  function applyResult() {
    if (mode === "summary") {
      if (parsedIntro || parsedSummary) {
        onApplySummary(parsedIntro || projectData.intro, parsedSummary || projectData.summary);
        toast.success("Pitch et résumé appliqués au projet !");
        onOpenChange(false);
      }
    } else if (mode === "technologies") {
      if (parsedTechs && parsedTechs.length > 0) {
        onApplyTechnologies(parsedTechs);
        toast.success("Technologies appliquées au projet !");
        onOpenChange(false);
      }
    } else if (mode === "case_study") {
      if (parsedBlocks && parsedBlocks.length > 0) {
        onApplyCaseStudyBlocks(parsedBlocks);
        toast.success("Étude de cas insérée dans le projet !");
        onOpenChange(false);
      }
    } else {
      if (generatedText) {
        onApplySummary(projectData.intro, generatedText.slice(0, 450));
        toast.success("Texte appliqué !");
        onOpenChange(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Assistant IA de Rédaction</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Générez vos études de cas et résumés guidés par vos compétences dynamiques (style sobre et sans émoji).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Sélection des modes (sans Telegram) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <button
            type="button"
            onClick={() => { setMode("case_study"); setGeneratedText(""); }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              mode === "case_study"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <FileText size={16} />
            <span>Étude de cas</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode("summary"); setGeneratedText(""); }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              mode === "summary"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <Wand2 size={16} />
            <span>Pitch & Résumé</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode("technologies"); setGeneratedText(""); }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              mode === "technologies"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <Lightbulb size={16} />
            <span>Technologies</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode("custom"); setGeneratedText(""); }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              mode === "custom"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <Sparkles size={16} />
            <span>Sur-mesure</span>
          </button>
        </div>

        {/* Contexte actif */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground">
            Projet : <span className="font-normal text-muted-foreground">{projectData.title || "(Veuillez saisir un titre)"}</span>
          </p>
          {projectData.technologies.length > 0 && (
            <p className="text-muted-foreground">
              Technologies : {projectData.technologies.join(", ")}
            </p>
          )}
        </div>

        {mode === "custom" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Votre consigne spécifique :</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Analyse les gains de performance après optimisation des requêtes SQL..."
              rows={3}
              className="w-full rounded-xl border border-input bg-background p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        )}

        {/* Bouton de génération */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleGenerate(mode)}
            className="gap-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-xs text-xs sm:text-sm h-10 px-4"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Rédaction en cours...</span>
              </>
            ) : (
              <>
                {generatedText ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                <span>{generatedText ? "Régénérer" : "Générer avec l'IA"}</span>
              </>
            )}
          </Button>
        </div>

        {/* Résultat */}
        {generatedText && (
          <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 animate-in fade-in-50">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-primary">Proposition générée</span>
              <span className="text-[11px] text-muted-foreground">Vérifiez avant d'appliquer</span>
            </div>

            {mode === "summary" && (
              <div className="space-y-2 text-xs">
                {parsedIntro && (
                  <div>
                    <span className="font-semibold text-primary">Accroche / Intro :</span>
                    <p className="mt-0.5 rounded-xl bg-background/90 p-2.5 text-xs border border-border/60 leading-relaxed">
                      {parsedIntro}
                    </p>
                  </div>
                )}
                {parsedSummary && (
                  <div>
                    <span className="font-semibold text-primary">Résumé de la fiche (moins de 400 caractères) :</span>
                    <p className="mt-0.5 rounded-xl bg-background/90 p-2.5 text-xs border border-border/60 leading-relaxed">
                      {parsedSummary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {mode === "technologies" && parsedTechs && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-primary">Technologies suggérées ({parsedTechs.length}) :</span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedTechs.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-background border border-primary/30 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {mode === "case_study" && parsedBlocks && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                <span className="text-xs font-semibold text-primary">
                  {parsedBlocks.length} blocs d'étude de cas prêts à être insérés :
                </span>
                <div className="space-y-2 text-xs">
                  {parsedBlocks.map((b, idx) => (
                    <div key={idx} className="rounded-xl bg-background/90 p-2.5 border border-border/60 leading-relaxed">
                      <span className="text-[10px] font-bold uppercase text-primary mr-1.5">
                        [{b.type}]
                      </span>
                      {b.type === "heading" && <span className="font-bold text-foreground">{b.text}</span>}
                      {b.type === "paragraph" && <span className="text-muted-foreground">{b.text}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === "custom" && (
              <div className="max-h-56 overflow-y-auto rounded-xl bg-background/90 p-3 text-xs leading-relaxed text-foreground border border-border/60 whitespace-pre-wrap">
                {generatedText}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-primary/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-full text-xs"
              >
                Fermer
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={applyResult}
                className="gap-1.5 rounded-full bg-primary text-primary-foreground text-xs shadow-xs font-semibold"
              >
                <Check size={14} />
                <span>Appliquer au projet</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
